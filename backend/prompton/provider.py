"""Claude-backed assistant for Prompton.

Streams responses from the Anthropic Messages API. The system prompt is frozen
and cached (prompt caching) so repeated turns reuse the prefix.
"""
import json

import anthropic
from django.conf import settings

# Frozen system prompt — keep byte-stable so prompt caching stays valid.
# (Per-user context, like the creator's available characters, is appended as a
# SEPARATE, non-cached system block by stream_reply — never edit this string for
# that, or the cache prefix breaks.)
SYSTEM_PROMPT = """You are Your Personal Creator Assistant for Vidora — the brain of a \
connected studio that turns an idea into a finished, published video. You GUIDE the creator \
through one continuous flow: idea -> image -> video -> voiceover -> edit -> publish, doing the \
thinking at every step. You are the conductor; the studio's screens just carry out what you set up.

HOW A SESSION GOES:
1) UNDERSTAND THE PROJECT. If the creator hasn't already said, ask what they want to make and
   give concrete options — e.g. a UGC-style ad, a product promo, a talking-head clip, cinematic
   b-roll, or a social reel. Keep it to one friendly question.
2) ASK WHAT YOU NEED — a little at a time, never a giant wall of questions. Gather only what's
   required to write great prompts: the subject/product, the platform (TikTok/Reels/YouTube,
   which drives aspect ratio), the vibe/tone, rough length, and whether it needs a spoken
   VOICEOVER (if yes, you'll write a script).
3) CHARACTER. If a real person should appear, ask whether they want to feature one of THEIR
   trained characters (a consistent face across shots). Their available characters — if any —
   are listed in the context below; refer to them by name. If they pick one, acknowledge it and
   remember it, and tell them to keep that character selected on the image screen so the same
   person carries through every shot. If they have none, mention they can train one under
   "Create Your Identity," or proceed without.
4) DELIVER. Once you have the essentials, stop asking and produce the build blocks below. Don't over-ask.

HANDING WORK TO THE STUDIO (one-click generation):
- IMAGE: output the still-image prompt as a fenced block tagged `image-prompt` containing ONLY
  the prompt (subject, style, lighting, composition, mood). ALWAYS append the target aspect ratio
  to the fence tag based on their platform: `16:9` for YouTube, `9:16` for TikTok / Reels / Shorts
  / Stories, `1:1` for square feed posts, `4:3` or `3:4` only if they ask. So the fence's first
  line looks like ```image-prompt 9:16 (tag, space, ratio). A "Create Image" button appears, and
  the image screen opens pre-set to that aspect. If they chose a character, remind them to keep it
  selected on the image screen.
- VIDEO: output the motion as a fenced block tagged `video-prompt` containing ONLY the motion
  (movement, camera action, pacing). A "Create Video" button appears.
- SCRIPT (only if they want a voiceover): output the spoken narration as a fenced block tagged
  `script` containing ONLY the words to be spoken — no scene directions, timestamps, or labels.
  A "Use as voiceover" button appears; in the editor it becomes an AI voiceover merged onto the video.
- MUSIC (when background music suits the video): output a short music description as a fenced block
  tagged `music` — genre, mood, instrumentation, tempo, and "no vocals" if it sits under a voiceover.
  A "Use as music" button appears; in the editor it generates an AI background track mixed under the video.
- ONE prompt (or ONE script/music) per block, so each gets its own button. Use a plain ``` block
  (no tag) for anything else — captions, hashtags, titles.

WALK THEM THROUGH THE STEPS, ONE AT A TIME:
- Start with the image: tell them to click Create Image, and that once it's ready the result
  screen has "Animate this into a video."
- After the video: if they wanted voice, send them to "Edit & Voiceover" and tell them to pick
  "Generate from script (AI voice)" — the script you wrote is waiting there. If they don't want
  voice, they can trim and go straight to publish. For audio, tell them to click "Auto-score
  with AI" in the editor's Music & SFX panel — the AI picks background music and sound effects
  that fit the video automatically, no prompt needed (they can still fine-tune by hand).
- Finish at PUBLISH — the editor's Publish gives a shareable link.
- After each step, end with a short, concrete nudge to the next one.

PRODUCT / REFERENCE IMAGES:
- The user can attach images (often a product). Look closely and weave the real details (color,
  shape, label, material) into the prompts and script so the output matches their actual product.
- If an attached image is unclear, ask one quick clarifying question.

STYLE:
- Concrete, creative, concise. Lead with the next action. Ask only what's needed, a little at a
  time — never dump every question at once."""

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


_MOTION_SYSTEM = (
    "You convert a still-image description into a short VIDEO motion prompt for an "
    "image-to-video model. The image already defines the scene, so describe ONLY "
    "movement: how the subject moves, the camera motion (e.g. slow push-in, gentle "
    "handheld sway), pacing, and ambient motion. 1-2 sentences, vivid but concise. "
    "Output the motion prompt only — no preamble, no quotes, no labels."
)


def suggest_motion_prompt(image_prompt: str) -> str:
    """Draft a concise image-to-video motion prompt from a still-image prompt."""
    client = _get_client()
    msg = client.messages.create(
        model=settings.PROMPTON_MODEL,
        max_tokens=400,
        system=_MOTION_SYSTEM,
        messages=[{"role": "user", "content": image_prompt.strip()[:2000]}],
    )
    text = "".join(
        block.text for block in msg.content if getattr(block, "type", None) == "text"
    ).strip()
    return text


_AUDIO_SYSTEM = (
    "You are the audio director for a short video. Given a brief about the video "
    "(its purpose, mood, and — if present — the spoken voiceover script), you decide "
    "the audio that best fits it: ONE background music bed and 0-3 short sound effects.\n\n"
    "Return ONLY a JSON object, no prose, no code fences, shaped exactly like:\n"
    '{"music": "<one music prompt>", "sfx": [{"description": "<short sfx>", "at": <seconds>}]}\n\n'
    "Rules:\n"
    "- music: genre, mood, instrumentation and tempo in a few words. If a voiceover "
    "script is present, the music MUST be instrumental — append 'no vocals'.\n"
    "- sfx: only include effects that genuinely suit the video (transitions, whooshes, "
    "ambience, impacts). Each 'at' is the seconds offset where it should land, within "
    "the given duration. Use [] if no sound effects fit.\n"
    "- Keep every description concise and concrete. Output valid JSON only."
)


def suggest_audio(brief: str, duration: float | None = None) -> dict:
    """Decide a fitting music bed + sound effects for a video from a short brief.

    Returns {"music": str, "sfx": [{"description": str, "at": float}, ...]}.
    `brief` describes the video (content type, mood, voiceover script if any);
    `duration` is the video length in seconds (used to place sound effects).
    """
    client = _get_client()
    dur = max(1.0, float(duration or 10.0))
    user = f"Video duration: ~{round(dur, 1)} seconds.\n\nBrief:\n{brief.strip()[:4000]}"
    msg = client.messages.create(
        model=settings.PROMPTON_MODEL,
        max_tokens=600,
        system=_AUDIO_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(
        block.text for block in msg.content if getattr(block, "type", None) == "text"
    ).strip()
    # Be forgiving: strip accidental code fences before parsing.
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):]
    try:
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
    except (ValueError, json.JSONDecodeError):
        return {"music": "", "sfx": []}

    music = (data.get("music") or "").strip()
    sfx = []
    for item in (data.get("sfx") or [])[:3]:
        if not isinstance(item, dict):
            continue
        desc = (item.get("description") or "").strip()
        if not desc:
            continue
        try:
            at = max(0.0, min(float(item.get("at", 0.0)), dur))
        except (TypeError, ValueError):
            at = 0.0
        sfx.append({"description": desc, "at": at})
    return {"music": music, "sfx": sfx}


def stream_reply(history, context: str = ""):
    """Yield ("delta", text) for each chunk, then ("final", message) at the end.

    `history` is a list of {"role": "user"|"assistant", "content": str}.
    `context` is optional per-user info (e.g. the creator's available characters);
    it goes in a SEPARATE, non-cached system block so the frozen prompt's cache
    prefix stays valid.
    """
    client = _get_client()
    system = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]
    if context:
        system.append({"type": "text", "text": context})
    with client.messages.stream(
        model=settings.PROMPTON_MODEL,
        max_tokens=8000,
        system=system,
        messages=history,
    ) as stream:
        for text in stream.text_stream:
            yield "delta", text
        final = stream.get_final_message()
    yield "final", final

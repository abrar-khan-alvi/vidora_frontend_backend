"""Claude-backed assistant for Prompton.

Streams responses from the Anthropic Messages API. The system prompt is frozen
and cached (prompt caching) so repeated turns reuse the prefix.
"""
import anthropic
from django.conf import settings

# Frozen system prompt — keep byte-stable so prompt caching stays valid.
SYSTEM_PROMPT = """You are Your Personal Creator Assistant for Vidora — the all-in-one \
studio where creators turn ideas into images, videos, and voiceovers.

You don't just answer — you GUIDE. Walk the creator through a connected flow:
idea -> image -> video -> voice -> publish. After each step, suggest the natural next one
so it feels like one continuous ecosystem, not separate tools.

HANDING WORK TO THE STUDIO (very important):
Vidora can generate directly from the prompts you write. To make that one-click:
- When you write a prompt the user can generate an IMAGE from, output it as a fenced code
  block tagged `image-prompt` containing ONLY the image prompt text (subject, style,
  lighting, composition, mood).
- When you write a prompt for a VIDEO, output it as a fenced code block tagged
  `video-prompt` containing ONLY the video prompt text (motion, camera action, pacing).
- A "Create" button appears beneath each of these blocks. Tell the user they can click it to
  generate immediately — no copy/paste needed.
- Put ONE prompt per block, so each gets its own Create button.
- Use a normal ``` code block (no tag) for anything NOT meant to be generated — scripts,
  captions, hashtags, titles.

PRODUCT / REFERENCE IMAGES:
- The user can attach images (often a product they want to promote). Look at them carefully.
- Describe the product accurately and weave its real details (color, shape, label, material)
  into the `image-prompt` / `video-prompt` and any ad scripts, so the output matches their product.
- If an attached image is unclear, ask one quick clarifying question.

GUIDING THE FLOW:
- After giving an `image-prompt`, invite them to create it, and mention that once the image is
  ready they can animate it into a video right from the result screen.
- After a `video-prompt`, mention they can add a voiceover next.
- Always end with a short, friendly nudge toward the next step.

Example:
```image-prompt
Editorial portrait of a young entrepreneur in a sunlit loft, 35mm, soft rim light, shallow depth of field, warm tones
```

STYLE:
- Be concrete, creative, and concise. Lead with the deliverable first.
- Keep chat replies focused; don't pad."""

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


def stream_reply(history):
    """Yield ("delta", text) for each chunk, then ("final", message) at the end.

    `history` is a list of {"role": "user"|"assistant", "content": str}.
    """
    client = _get_client()
    with client.messages.stream(
        model=settings.PROMPTON_MODEL,
        max_tokens=8000,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=history,
    ) as stream:
        for text in stream.text_stream:
            yield "delta", text
        final = stream.get_final_message()
    yield "final", final

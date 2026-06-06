"""Claude-backed assistant for Prompton.

Streams responses from the Anthropic Messages API. The system prompt is frozen
and cached (prompt caching) so repeated turns reuse the prefix.
"""
import anthropic
from django.conf import settings

# Frozen system prompt — keep byte-stable so prompt caching stays valid.
SYSTEM_PROMPT = """You are Prompton, the in-app creative director for Vidora — an AI \
content studio for generating images, videos, and voiceovers.

Your job is to help creators turn rough ideas into production-ready outputs:
- Write vivid, specific **image prompts** (subject, style, lighting, composition, lens, mood, color palette).
- Write **video prompts** for image-to-video (motion, camera movement, pacing, duration feel).
- Write **scripts and voiceover copy** (hooks, narration, tone, length cues).
- Refine and iterate on prompts the user already has.

Guidelines:
- Be concrete and visual. Prefer concise, high-signal prompts over long paragraphs.
- When a request is ambiguous, make reasonable creative choices and note them briefly rather than stalling with questions.
- When you produce a prompt meant to be pasted into the image or video generator, put it in its own fenced code block so it is easy to copy.
- Keep chat replies focused; lead with the deliverable, then a short note on choices if useful."""

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


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

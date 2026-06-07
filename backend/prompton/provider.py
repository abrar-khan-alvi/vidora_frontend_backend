"""Claude-backed assistant for Prompton.

Streams responses from the Anthropic Messages API. The system prompt is frozen
and cached (prompt caching) so repeated turns reuse the prefix.
"""
import anthropic
from django.conf import settings

# Frozen system prompt — keep byte-stable so prompt caching stays valid.
SYSTEM_PROMPT = """You are Your Personal Creator Assistant for Vidora — the ultimate \
creator studio for designing what the world watches.

Your job is to guide creators through a unified 6-Step Creator Flow to build, brand, and scale their content:
1. **Your Assistant**: Help creators brainstorm concepts, write scripts, and build visual prompts.
2. **Create Your Identity**: Guide them to train unique character references (faces, styles) to keep content personalized.
3. **Bring To Life**: Write detailed image prompts (subject, style, lighting, composition, mood) and video prompts (motion, camera action, pacing) to generate premium visuals.
4. **Give It A Voice**: Write hooks, narrations, and scripts optimized for voiceovers or cloned voices.
5. **Make It Go Viral**: Refine copy, timing, and narrative hooks specifically designed to optimize audience retention on social media (TikTok, Reels, Shorts).
6. **Publish Everywhere**: Help prepare download/export descriptions, hashtags, and strategies to share on all platforms.

Guidelines:
- Be outcome-focused, concrete, and highly creative. Keep replies engaging and visually descriptive.
- When producing prompts meant for generating visuals, wrap them in clean, fenced code blocks for easy copying.
- Keep chat replies concise and focused; lead with the creative deliverable first."""

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

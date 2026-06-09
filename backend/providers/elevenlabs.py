"""ElevenLabs provider for VoiceSync AI (voice cloning + text-to-speech).

Higgsfield's API has no voice/TTS, so cloning and speech synthesis come from
ElevenLabs. We call it with raw `httpx` (already a dependency) to match the
minimal provider style used in `higgsfield.py` — no heavy SDK.

Auth: header `xi-api-key: <key>`. Base URL `https://api.elevenlabs.io`.
"""
import httpx
from django.conf import settings


def _headers(extra: dict | None = None) -> dict:
    h = {"xi-api-key": settings.ELEVENLABS_API_KEY, "User-Agent": "vidora"}
    if extra:
        h.update(extra)
    return h


def _base() -> str:
    return settings.ELEVENLABS_BASE_URL.rstrip("/")


def clone_voice(name: str, sample_bytes: bytes, mime: str = "audio/mpeg", filename: str = "sample") -> str:
    """Instant-clone a voice from one audio sample. Returns the provider voice_id.

    `POST /v1/voices/add` is multipart: `name` + `files[]`. ElevenLabs accepts the
    clone synchronously and returns `{"voice_id": ...}` once the voice is ready.
    """
    files = {"files": (filename, sample_bytes, mime or "audio/mpeg")}
    data = {"name": name[:100] or "Voice"}
    resp = httpx.post(
        f"{_base()}/v1/voices/add",
        headers=_headers(),
        data=data,
        files=files,
        timeout=120,
    )
    resp.raise_for_status()
    voice_id = resp.json().get("voice_id")
    if not voice_id:
        raise RuntimeError("ElevenLabs did not return a voice_id.")
    return voice_id


def text_to_speech(voice_id: str, text: str, model_id: str | None = None) -> bytes:
    """Synthesize `text` in the given cloned voice. Returns mp3 audio bytes.

    `POST /v1/text-to-speech/{voice_id}` streams audio back in the response body.
    """
    body = {
        "text": text,
        "model_id": model_id or settings.ELEVENLABS_TTS_MODEL,
    }
    resp = httpx.post(
        f"{_base()}/v1/text-to-speech/{voice_id}",
        headers=_headers({"Content-Type": "application/json", "Accept": "audio/mpeg"}),
        json=body,
        timeout=180,
    )
    resp.raise_for_status()
    return resp.content


def generate_music(prompt: str, length_ms: int | None = None) -> bytes:
    """Generate a background music track from a text prompt (Eleven Music).

    `POST /v1/music` returns mp3 audio. `music_length_ms` is optional (the model
    picks a sensible length otherwise); the API floor is ~10s.
    """
    body: dict = {"prompt": prompt}
    if length_ms:
        body["music_length_ms"] = int(length_ms)
    resp = httpx.post(
        f"{_base()}/v1/music",
        headers=_headers({"Content-Type": "application/json", "Accept": "audio/mpeg"}),
        json=body,
        timeout=300,
    )
    resp.raise_for_status()
    return resp.content


def generate_sound_effect(text: str, duration_seconds: float | None = None,
                          prompt_influence: float = 0.3) -> bytes:
    """Generate a sound effect / ambience clip from a text prompt.

    `POST /v1/sound-generation` returns mp3 audio. `duration_seconds` is optional
    (auto if omitted); max ~22s.
    """
    body: dict = {"text": text, "prompt_influence": prompt_influence}
    if duration_seconds:
        body["duration_seconds"] = float(duration_seconds)
    resp = httpx.post(
        f"{_base()}/v1/sound-generation",
        headers=_headers({"Content-Type": "application/json", "Accept": "audio/mpeg"}),
        json=body,
        timeout=180,
    )
    resp.raise_for_status()
    return resp.content


def delete_voice(voice_id: str) -> None:
    """Delete a cloned voice at the provider. Best-effort (ignores 404)."""
    resp = httpx.delete(
        f"{_base()}/v1/voices/{voice_id}", headers=_headers(), timeout=30
    )
    if resp.status_code not in (200, 204, 404):
        resp.raise_for_status()


def list_voices() -> list[dict]:
    """List the account's voices (used to verify the key live)."""
    resp = httpx.get(f"{_base()}/v1/voices", headers=_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json().get("voices", [])


def list_stock_voices() -> list[dict]:
    """The ElevenLabs built-in ("premade") library voices, shaped for the UI.

    These are ready-made voices a user can pick for TTS without cloning. Each
    has a preview clip and gender/age tags. Returns {id, name, description,
    preview_url, gender, age}.
    """
    out = []
    for v in list_voices():
        if v.get("category") != "premade":
            continue
        full = v.get("name") or ""
        name, _, desc = full.partition(" - ")
        labels = v.get("labels") or {}
        out.append({
            "id": v.get("voice_id"),
            "name": name.strip() or full,
            "description": desc.strip() or v.get("description") or "",
            "preview_url": v.get("preview_url") or "",
            "gender": labels.get("gender", ""),
            "age": labels.get("age", ""),
        })
    return out

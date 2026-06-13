"""Higgsfield image provider using the official `higgsfield-client` SDK.

`subscribe()` blocks until the generation finishes, which is exactly what we
want inside a Celery worker — Celery is the async layer, so no separate poll loop.

Soul endpoint shape: `higgsfield-ai/soul/<mode>` where mode is one of
{standard, reference, character}. We use `standard` for a plain prompt and
`reference` when the user supplies reference images (passed as `input_images`).
"""
import os

import higgsfield_client
import httpx
from django.conf import settings

HF_BASE_URL = "https://platform.higgsfield.ai"


def _ensure_credentials():
    if settings.HIGGSFIELD_API_KEY:
        os.environ.setdefault("HF_API_KEY", settings.HIGGSFIELD_API_KEY)
    if settings.HIGGSFIELD_API_SECRET:
        os.environ.setdefault("HF_API_SECRET", settings.HIGGSFIELD_API_SECRET)


def _auth_headers() -> dict:
    key = f"{settings.HIGGSFIELD_API_KEY}:{settings.HIGGSFIELD_API_SECRET}"
    return {
        "Authorization": f"Key {key}",
        "Content-Type": "application/json",
        "User-Agent": "vidora",
    }


# --- Custom references (SoulId) ---------------------------------------------
# Soul's "reference" model takes a `style_id` (UUID) — a TRAINED custom reference,
# not an inline image. We create one from the user's photo(s), poll until it's
# ready, then pass its id as `style_id` when generating.

# Higgsfield reports "ready" EARLY (the reference was accepted; training hasn't
# finished) and only "completed" once it's actually trained and usable. Treating
# "ready" as done marked characters usable mid-training, so generation failed with
# "character_not_found". Only a true completion status counts as ready.
READY_STATUSES = {"completed", "succeeded", "success"}
FAILED_STATUSES = {"failed", "error", "canceled", "cancelled", "nsfw"}


def create_custom_reference(name: str, image_urls: list[str]) -> dict:
    """Create a trained custom reference from Higgsfield-hosted image URLs.

    Returns the provider record, e.g. {"id": ..., "status": "not_ready", ...}.
    """
    body = {
        "name": name[:120] or "Reference",
        "input_images": [{"type": "image_url", "image_url": u} for u in image_urls],
    }
    resp = httpx.post(
        f"{HF_BASE_URL}/v1/custom-references", headers=_auth_headers(), json=body, timeout=60
    )
    resp.raise_for_status()
    return resp.json()


def get_custom_reference(ref_id: str) -> dict:
    """Fetch a custom reference's current state (for status polling)."""
    resp = httpx.get(
        f"{HF_BASE_URL}/v1/custom-references/{ref_id}", headers=_auth_headers(), timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def list_soul_styles() -> list[dict]:
    """List Higgsfield's built-in Soul style presets (the `style_id` catalog).

    Returns a list of {id, name, description, preview_url}. These are aesthetic
    presets (a *look*), distinct from custom references (a *subject*).
    """
    resp = httpx.get(
        f"{HF_BASE_URL}/v1/text2image/soul-styles", headers=_auth_headers(), timeout=30
    )
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else data.get("styles", [])


def upload_reference(data: bytes, mime: str = "image/png") -> str:
    """Upload raw image bytes to Higgsfield storage; returns a public URL.

    Higgsfield needs reference images at a publicly reachable URL. Its own
    upload endpoint hands back a CloudFront URL, so we don't need external
    object storage (R2/S3) in development.
    """
    _ensure_credentials()
    return higgsfield_client.upload(data, mime or "image/png")


def _extract_urls(result) -> list[str]:
    """Pull image URLs out of the SDK result, tolerating a few known shapes."""
    if isinstance(result, dict):
        images = result.get("images")
        if isinstance(images, list):
            urls = []
            for img in images:
                if isinstance(img, dict):
                    url = img.get("url") or img.get("raw", {}).get("url")
                    if url:
                        urls.append(url)
                elif isinstance(img, str):
                    urls.append(img)
            if urls:
                return urls
        for key in ("image_url", "url", "output_url"):
            if result.get(key):
                return [result[key]]
    raise RuntimeError(f"No image URL in Higgsfield result: {str(result)[:300]}")


def _extract_video_urls(result) -> list[str]:
    """Pull video URLs out of the SDK result, tolerating a few known shapes."""
    if isinstance(result, dict):
        videos = result.get("videos")
        if isinstance(videos, list):
            urls = []
            for vid in videos:
                if isinstance(vid, dict):
                    url = vid.get("url") or vid.get("raw", {}).get("url")
                    if url:
                        urls.append(url)
                elif isinstance(vid, str):
                    urls.append(vid)
            if urls:
                return urls
        video = result.get("video")
        if isinstance(video, dict) and video.get("url"):
            return [video["url"]]
        for key in ("video_url", "url", "output_url"):
            if result.get(key):
                return [result[key]]
    raise RuntimeError(f"No video URL in Higgsfield result: {str(result)[:300]}")


def generate_video(
    *,
    model_type="dop",
    image_url=None,
    end_image_url=None,
    prompt="",
    seed=None,
    **kwargs,
) -> list[str]:
    """Animate a source image into a video (blocks until done).

    Supports DoP (Director of Photography), Seedance 2.0, and Kling models.
    """
    _ensure_credentials()

    app = ""
    arguments = {}

    if prompt:
        arguments["prompt"] = prompt
    if seed is not None:
        arguments["seed"] = seed

    if model_type == "dop":
        # DoP's app_model_slug must be one of lite/standard/turbo. Normalize the
        # UI's values (dop-lite / dop-preview / dop-turbo) to the API enum.
        raw = (kwargs.get("quality") or settings.HIGGSFIELD_VIDEO_QUALITY or "standard")
        q = str(raw).replace("dop-", "").strip().lower()
        if q == "preview":
            q = "standard"
        if q not in ("lite", "standard", "turbo"):
            q = "standard"
        mode = f"{q}/{settings.HIGGSFIELD_VIDEO_FLF_SUFFIX}" if end_image_url else q
        app = f"{settings.HIGGSFIELD_VIDEO_APP_BASE}/{mode}"
        
        arguments["image_url"] = image_url
        if end_image_url:
            arguments["end_image_url"] = end_image_url
        if "motion_id" in kwargs and kwargs["motion_id"]:
            arguments["motion_id"] = kwargs["motion_id"]
        if "motion_strength" in kwargs:
            arguments["motion_strength"] = kwargs["motion_strength"]
        if "enhance_prompt" in kwargs:
            arguments["enhance_prompt"] = kwargs["enhance_prompt"]
        if "check_nsfw" in kwargs:
            arguments["check_nsfw"] = kwargs["check_nsfw"]

    elif model_type == "seedance":
        # Per the Higgsfield API docs: ByteDance Seedance v1 Pro, field `image_url`.
        # (Auto-selects image-to-video vs text-to-video.) Note: this model must be
        # enabled on the API key — otherwise the platform returns 404 "Model not found".
        if image_url:
            app = "bytedance/seedance/v1/pro/image-to-video"
            arguments["image_url"] = image_url
        else:
            app = "bytedance/seedance/v1/pro/text-to-video"

        if "resolution" in kwargs:
            arguments["resolution"] = kwargs["resolution"]
        if "aspect_ratio" in kwargs:
            arguments["aspect_ratio"] = kwargs["aspect_ratio"]
        if "duration" in kwargs:
            arguments["duration"] = kwargs["duration"]
        if "enhance_prompt" in kwargs:
            arguments["enhance_prompt"] = kwargs["enhance_prompt"]

    elif model_type == "kling":
        app = kwargs.get("model") or "kling-video/v2.6/pro/image-to-video"

        # Kling's image-to-video requires `image_url` (not `start_image_url`).
        if image_url:
            arguments["image_url"] = image_url
        if end_image_url:
            arguments["end_image_url"] = end_image_url
        if "duration" in kwargs:
            arguments["duration"] = kwargs["duration"]
        if "aspect_ratio" in kwargs:
            arguments["aspect_ratio"] = kwargs["aspect_ratio"]
        if "negative_prompt" in kwargs and kwargs["negative_prompt"]:
            arguments["negative_prompt"] = kwargs["negative_prompt"]
        if "enhance_prompt" in kwargs:
            arguments["enhance_prompt"] = kwargs["enhance_prompt"]

    else:
        raise ValueError(f"Unknown model_type: {model_type}")

    try:
        result = higgsfield_client.subscribe(app, arguments)
    except Exception as exc:
        # A "model not found" means this model slug isn't enabled on the API key.
        if "not found" in str(exc).lower() or "404" in str(exc):
            raise RuntimeError(
                f"The '{model_type}' model isn’t enabled on this Higgsfield API key "
                f"(slug: {app}). DoP and Kling are available; ask Higgsfield to enable "
                f"this model for the key, or pick another model."
            ) from exc
        raise
    return _extract_video_urls(result)


def generate_image(
    *,
    prompt,
    aspect="1:1",
    num_outputs=1,
    seed=None,
    reference_id=None,
    reference_strength=1.0,
    style_id=None,
    style_strength=1.0,
) -> list[str]:
    """Generate image(s) and return a list of output URLs (blocks until done).

    Two independent, composable controls:
    - `reference_id` → a trained custom-reference (the *subject*), sent as
      `custom_reference_id`. Uses the Soul *reference* app.
    - `style_id` → a built-in Soul style preset (the *look*), sent as `style_id`.

    Either, both, or neither may be supplied. (Passing a custom reference into the
    `style_id` slot fails with "Soul style not found" — they are different things.)
    """
    _ensure_credentials()

    arguments = {
        "prompt": prompt,
        "aspect_ratio": aspect,
        "resolution": settings.HIGGSFIELD_IMAGE_RESOLUTION,
    }
    if seed is not None:
        arguments["seed"] = seed

    if reference_id:
        arguments["custom_reference_id"] = reference_id
        arguments["custom_reference_strength"] = reference_strength
    if style_id:
        arguments["style_id"] = style_id
        arguments["style_strength"] = style_strength

    # The reference app is required to engage a custom reference; otherwise the
    # standard app handles a plain prompt (with an optional style preset).
    app = settings.HIGGSFIELD_IMAGE_APP_REFERENCE if reference_id else settings.HIGGSFIELD_IMAGE_APP

    result = higgsfield_client.subscribe(app, arguments)
    return _extract_urls(result)

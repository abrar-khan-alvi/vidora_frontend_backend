"""Higgsfield image provider using the official `higgsfield-client` SDK.

`subscribe()` blocks until the generation finishes, which is exactly what we
want inside a Celery worker — Celery is the async layer, so no separate poll loop.

Soul endpoint shape: `higgsfield-ai/soul/<mode>` where mode is one of
{standard, reference, character}. We use `standard` for a plain prompt and
`reference` when the user supplies reference images (passed as `input_images`).
"""
import os

import higgsfield_client
from django.conf import settings


def _ensure_credentials():
    if settings.HIGGSFIELD_API_KEY:
        os.environ.setdefault("HF_API_KEY", settings.HIGGSFIELD_API_KEY)
    if settings.HIGGSFIELD_API_SECRET:
        os.environ.setdefault("HF_API_SECRET", settings.HIGGSFIELD_API_SECRET)


def upload_reference(data: bytes, mime: str = "image/png") -> str:
    """Upload raw image bytes to Higgsfield storage; returns a public URL.

    Higgsfield needs reference images at a publicly reachable URL. Its own
    upload endpoint hands back a CloudFront URL, so we don't need external
    object storage (R2/S3) in development.
    """
    _ensure_credentials()
    return higgsfield_client.upload(data, mime or "image/png")


def _reference_payload(reference_urls) -> list[dict]:
    """Shape reference URLs the way the Soul reference model expects."""
    return [{"type": "image_url", "image_url": url} for url in reference_urls]


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
    image_url,
    end_image_url=None,
    prompt="",
    quality=None,
    seed=None,
) -> list[str]:
    """Animate a source image into a video (blocks until done).

    DoP slug is `<base>/<quality>`, or `<base>/<quality>/first-last-frame` when an
    end frame is given (start→end interpolation). Returns output video URL(s).
    """
    _ensure_credentials()

    quality = quality or settings.HIGGSFIELD_VIDEO_QUALITY
    mode = f"{quality}/{settings.HIGGSFIELD_VIDEO_FLF_SUFFIX}" if end_image_url else quality
    app = f"{settings.HIGGSFIELD_VIDEO_APP_BASE}/{mode}"

    arguments = {"image_url": image_url}
    if prompt:
        arguments["prompt"] = prompt
    if end_image_url:
        arguments["end_image_url"] = end_image_url
    if seed is not None:
        arguments["seed"] = seed

    result = higgsfield_client.subscribe(app, arguments)
    return _extract_video_urls(result)


def generate_image(
    *,
    prompt,
    aspect="1:1",
    num_outputs=1,
    seed=None,
    reference_urls=None,
    character_id=None,
) -> list[str]:
    """Generate image(s) and return a list of output URLs (blocks until done).

    When `reference_urls` are supplied we switch to the Soul *reference* model
    and attach them as `input_images`; otherwise we use the standard model.
    """
    _ensure_credentials()

    arguments = {
        "prompt": prompt,
        "aspect_ratio": aspect,
        "resolution": settings.HIGGSFIELD_IMAGE_RESOLUTION,
    }
    if seed is not None:
        arguments["seed"] = seed

    if reference_urls:
        app = settings.HIGGSFIELD_IMAGE_APP_REFERENCE
        arguments["input_images"] = _reference_payload(reference_urls)
    else:
        app = settings.HIGGSFIELD_IMAGE_APP

    result = higgsfield_client.subscribe(app, arguments)
    return _extract_urls(result)

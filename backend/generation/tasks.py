import os

import httpx
from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from providers import higgsfield
from studio.models import Asset

from . import credits
from .models import GenerationJob


def _asset_hf_url(asset: Asset) -> str:
    """Public Higgsfield URL for a user's uploaded image, uploading + caching once.

    Higgsfield fetches input images by URL, so we push the user's bytes to
    Higgsfield's storage (CloudFront). The URL is cached on the Asset so a reused
    library image isn't re-uploaded on every generation.
    """
    if asset.higgsfield_url:
        return asset.higgsfield_url
    with asset.file.open("rb") as fh:
        data = fh.read()
    hf_url = higgsfield.upload_reference(data, asset.mime or "image/png")
    asset.higgsfield_url = hf_url
    asset.save(update_fields=["higgsfield_url"])
    return hf_url


def _resolve_reference_urls(job: GenerationJob) -> list[str]:
    """Upload the job's reference Assets to Higgsfield and return public URLs."""
    ref_ids = job.input_params.get("references") or []
    if not ref_ids:
        return []
    urls = []
    by_id = {str(a.id): a for a in Asset.objects.filter(id__in=ref_ids, user=job.user)}
    for ref_id in ref_ids:  # preserve user-chosen order
        asset = by_id.get(ref_id)
        if asset and asset.file:
            urls.append(_asset_hf_url(asset))
    return urls


def _frame_url(job: GenerationJob, param: str) -> str | None:
    """Resolve a single frame Asset id (start/end) to a Higgsfield URL."""
    asset_id = job.input_params.get(param)
    if not asset_id:
        return None
    asset = Asset.objects.filter(id=asset_id, user=job.user).first()
    return _asset_hf_url(asset) if asset and asset.file else None


def _download_asset(url: str, job: GenerationJob, asset_type=Asset.Type.IMAGE) -> Asset:
    resp = httpx.get(url, timeout=180, follow_redirects=True)
    resp.raise_for_status()
    default_ext = ".mp4" if asset_type == Asset.Type.VIDEO else ".png"
    ext = os.path.splitext(url.split("?")[0])[1] or default_ext
    name = f"gen_{job.id}{ext}"
    asset = Asset(
        user=job.user,
        source=Asset.Source.GENERATED,
        type=asset_type,
        mime=resp.headers.get("content-type", ""),
        job_id=job.id,
    )
    asset.file.save(name, ContentFile(resp.content), save=True)
    return asset


@shared_task
def run_image_generation(job_id: str):
    """Submit the job to Higgsfield (blocking), then re-host the outputs as Assets."""
    try:
        job = GenerationJob.objects.get(id=job_id)
    except GenerationJob.DoesNotExist:
        return
    if job.status in GenerationJob.TERMINAL:
        return

    job.status = GenerationJob.Status.SUBMITTED
    job.submitted_at = timezone.now()
    job.attempts += 1
    job.save(update_fields=["status", "submitted_at", "attempts"])

    params = job.input_params
    try:
        job.status = GenerationJob.Status.PROCESSING
        job.save(update_fields=["status"])
        reference_urls = _resolve_reference_urls(job)
        urls = higgsfield.generate_image(
            prompt=params["prompt"],
            aspect=params.get("aspect", "1:1"),
            num_outputs=params.get("num_outputs", 1),
            seed=params.get("seed"),
            reference_urls=reference_urls,
        )
    except Exception as exc:  # provider/network failure
        job.status = GenerationJob.Status.FAILED
        job.error = str(exc)[:1000]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    asset_ids = []
    for url in urls:
        try:
            asset_ids.append(str(_download_asset(url, job).id))
        except Exception:
            continue

    if not asset_ids:
        job.status = GenerationJob.Status.FAILED
        job.error = "No output images could be saved."
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    cost = credits.COST["image"]
    job.output_asset_ids = asset_ids
    job.status = GenerationJob.Status.SUCCEEDED
    job.credits_cost = cost
    job.completed_at = timezone.now()
    job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
    credits.record(job.user, -cost, "image_generation", job.id)


@shared_task
def run_video_generation(job_id: str):
    """Animate a source image (DoP image-to-video), then re-host the output video."""
    try:
        job = GenerationJob.objects.get(id=job_id)
    except GenerationJob.DoesNotExist:
        return
    if job.status in GenerationJob.TERMINAL:
        return

    job.status = GenerationJob.Status.SUBMITTED
    job.submitted_at = timezone.now()
    job.attempts += 1
    job.save(update_fields=["status", "submitted_at", "attempts"])

    params = job.input_params
    try:
        job.status = GenerationJob.Status.PROCESSING
        job.save(update_fields=["status"])
        image_url = _frame_url(job, "source")
        if not image_url:
            raise RuntimeError("Source image is required for video generation.")
        urls = higgsfield.generate_video(
            image_url=image_url,
            end_image_url=_frame_url(job, "end_frame"),
            prompt=params.get("prompt", ""),
            quality=params.get("quality"),
            seed=params.get("seed"),
        )
    except Exception as exc:  # provider/network failure
        job.status = GenerationJob.Status.FAILED
        job.error = str(exc)[:1000]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    asset_ids = []
    for url in urls:
        try:
            asset_ids.append(str(_download_asset(url, job, Asset.Type.VIDEO).id))
        except Exception:
            continue

    if not asset_ids:
        job.status = GenerationJob.Status.FAILED
        job.error = "No output video could be saved."
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    cost = credits.COST["video"]
    job.output_asset_ids = asset_ids
    job.status = GenerationJob.Status.SUCCEEDED
    job.credits_cost = cost
    job.completed_at = timezone.now()
    job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
    credits.record(job.user, -cost, "video_generation", job.id)

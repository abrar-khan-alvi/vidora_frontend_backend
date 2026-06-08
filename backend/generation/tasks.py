import os

import httpx
from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from providers import elevenlabs, higgsfield
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


def _resolve_reference_style_id(job: GenerationJob) -> str | None:
    """Resolve the job's selected reference (Character) to its Higgsfield
    custom-reference id, used as Soul `style_id`. Errors if it isn't ready."""
    char_id = job.input_params.get("reference")
    if not char_id:
        return None
    from studio.models import Character

    char = Character.objects.filter(id=char_id, user=job.user).first()
    if not char:
        raise RuntimeError("Selected reference was not found.")
    if char.status != Character.Status.READY or not char.provider_character_id:
        raise RuntimeError("Selected reference is still training — try again once it's ready.")
    return char.provider_character_id


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
        reference_id = _resolve_reference_style_id(job)
        urls = higgsfield.generate_image(
            prompt=params["prompt"],
            aspect=params.get("aspect", "1:1"),
            num_outputs=params.get("num_outputs", 1),
            seed=params.get("seed"),
            reference_id=reference_id,
            reference_strength=params.get("reference_strength", 1.0),
            style_id=params.get("style"),
            style_strength=params.get("style_strength", 1.0),
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
        model_type = params.get("model_type", "dop")
        if model_type == "dop" and not image_url:
            raise RuntimeError("Source image is required for DoP video generation.")
            
        exclude_keys = {"source", "end_frame", "prompt", "seed", "model_type"}
        extra_args = {k: v for k, v in params.items() if k not in exclude_keys}

        urls = higgsfield.generate_video(
            model_type=model_type,
            image_url=image_url,
            end_image_url=_frame_url(job, "end_frame"),
            prompt=params.get("prompt", ""),
            seed=params.get("seed"),
            **extra_args,
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


@shared_task
def run_ugc_generation(job_id: str):
    """Produce a talking-avatar UGC video: voiceover (ElevenLabs WAV) → Higgsfield
    Speak lip-syncs it to the avatar image → re-host the output video."""
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

        image_url = _frame_url(job, "image")
        if not image_url:
            raise RuntimeError("Avatar image is required.")

        text = (params.get("text") or "").strip()
        if not text:
            raise RuntimeError("No script to speak.")

        # 1) Voiceover as WAV (Speak requires audio/x-wav), 2) host it on Higgsfield.
        provider_voice_id = _resolve_voice_id(job)
        wav = elevenlabs.text_to_speech_wav(provider_voice_id, text)
        audio_url = higgsfield.upload_reference(wav, "audio/x-wav")

        scenario = (params.get("scenario") or "").strip() or (
            "A person speaking naturally and expressively to the camera, "
            "subtle head movement, warm and engaging delivery."
        )

        urls = higgsfield.generate_speak(
            image_url=image_url,
            audio_url=audio_url,
            prompt=scenario,
            quality=params.get("quality"),
            duration=params.get("duration"),
            seed=params.get("seed"),
            enhance_prompt=params.get("enhance_prompt"),
        )
    except Exception as exc:
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

    cost = credits.COST["ugc"]
    job.output_asset_ids = asset_ids
    job.status = GenerationJob.Status.SUCCEEDED
    job.credits_cost = cost
    job.completed_at = timezone.now()
    job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
    credits.record(job.user, -cost, "ugc_generation", job.id)


def _resolve_voice_id(job: GenerationJob) -> str:
    """Resolve the TTS job to a provider voice_id — either a cloned Voice (by our
    id) or a built-in stock voice (ElevenLabs premade id passed through)."""
    from studio.models import Voice

    voice_id = job.input_params.get("voice")
    if voice_id:
        voice = Voice.objects.filter(id=voice_id, user=job.user).first()
        if not voice:
            raise RuntimeError("Selected voice was not found.")
        if voice.status != Voice.Status.READY or not voice.provider_voice_id:
            raise RuntimeError("Selected voice is still being cloned — try again once it's ready.")
        return voice.provider_voice_id

    stock = job.input_params.get("stock_voice_id")
    if stock:
        return stock

    raise RuntimeError("No voice selected.")


@shared_task
def run_tts_generation(job_id: str):
    """Synthesize speech in a cloned voice (ElevenLabs), then store it as an audio Asset."""
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
        provider_voice_id = _resolve_voice_id(job)
        text = (params.get("text") or "").strip()
        if not text:
            raise RuntimeError("No text to speak.")
        audio = elevenlabs.text_to_speech(provider_voice_id, text)
    except Exception as exc:  # provider/network failure
        job.status = GenerationJob.Status.FAILED
        job.error = str(exc)[:1000]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    # ElevenLabs returns mp3 bytes directly — save them straight to an Asset.
    asset = Asset(
        user=job.user,
        source=Asset.Source.GENERATED,
        type=Asset.Type.AUDIO,
        mime="audio/mpeg",
        job_id=job.id,
    )
    asset.file.save(f"gen_{job.id}.mp3", ContentFile(audio), save=True)

    cost = credits.COST["tts"]
    job.output_asset_ids = [str(asset.id)]
    job.status = GenerationJob.Status.SUCCEEDED
    job.credits_cost = cost
    job.completed_at = timezone.now()
    job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
    credits.record(job.user, -cost, "tts_generation", job.id)

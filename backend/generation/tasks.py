import os
import shutil
import tempfile

import httpx
from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone

from providers import elevenlabs, ffmpeg, higgsfield
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


def _dop_common_args(params: dict) -> dict:
    """The DoP generation knobs shared by every segment of an extend run."""
    args = {
        "quality": params.get("quality"),
        "motion_id": params.get("motion_id"),
        "motion_strength": params.get("motion_strength"),
        "enhance_prompt": params.get("enhance_prompt", False),
        "check_nsfw": params.get("check_nsfw", True),
    }
    return {k: v for k, v in args.items() if v is not None}


def _generate_dop_extended(job: GenerationJob, start_url: str, params: dict, segments: int) -> list[str]:
    """Build a longer DoP video by chaining ~5s segments.

    Each segment animates an image; its last frame is then uploaded and used as
    the start frame of the next, so the clips continue from one another. All
    segments are finally joined into one MP4 (FFmpeg) and stored as one Asset.
    """
    common = _dop_common_args(params)
    prompt = params.get("prompt", "")
    seed = params.get("seed")
    end_url = _frame_url(job, "end_frame")

    cur_image = start_url
    with tempfile.TemporaryDirectory() as tmp:
        seg_paths: list[str] = []
        for i in range(segments):
            is_last = i == segments - 1
            urls = higgsfield.generate_video(
                model_type="dop",
                image_url=cur_image,
                # End frame (if any) lands the final segment on a chosen shot.
                end_image_url=end_url if is_last else None,
                prompt=prompt,
                seed=seed,
                **common,
            )
            if not urls:
                raise RuntimeError(f"Segment {i + 1} of {segments} produced no video.")

            resp = httpx.get(urls[0], timeout=300, follow_redirects=True)
            resp.raise_for_status()
            seg_path = os.path.join(tmp, f"seg_{i}.mp4")
            with open(seg_path, "wb") as fh:
                fh.write(resp.content)
            seg_paths.append(seg_path)

            if not is_last:
                # Hand the segment's last frame to the next as its start frame.
                frame_path = os.path.join(tmp, f"frame_{i}.png")
                ffmpeg.extract_last_frame(seg_path, frame_path)
                with open(frame_path, "rb") as fh:
                    cur_image = higgsfield.upload_reference(fh.read(), "image/png")

        out_path = os.path.join(tmp, f"video_{job.id}.mp4")
        ffmpeg.render_edit(
            clips=[{"path": p, "start": 0.0, "end": None} for p in seg_paths],
            output_path=out_path,
            workdir=tmp,
        )
        with open(out_path, "rb") as fh:
            data = fh.read()

    asset = Asset(
        user=job.user,
        source=Asset.Source.GENERATED,
        type=Asset.Type.VIDEO,
        mime="video/mp4",
        job_id=job.id,
    )
    asset.file.save(f"video_{job.id}.mp4", ContentFile(data), save=True)
    return [str(asset.id)]


@shared_task
def run_video_generation(job_id: str):
    """Animate a source image (DoP image-to-video), then re-host the output video.

    For DoP with `segments` > 1, chains segments (last frame → next start frame)
    and joins them so the clip runs longer than the model's ~5s single shot.
    """
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

        # Longer videos: chain N ~5s DoP segments into one continuous clip.
        segments = int(params.get("segments") or 1)
        if model_type == "dop" and segments > 1:
            asset_ids = _generate_dop_extended(job, image_url, params, segments)
            cost = credits.COST["video"] * segments
            job.output_asset_ids = asset_ids
            job.status = GenerationJob.Status.SUCCEEDED
            job.credits_cost = cost
            job.completed_at = timezone.now()
            job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
            credits.record(job.user, -cost, "video_generation", job.id)
            return

        exclude_keys = {"source", "end_frame", "prompt", "seed", "model_type", "segments"}
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


@shared_task
def run_audio_fx_generation(job_id: str):
    """Generate background music or a sound effect (ElevenLabs), store as an audio Asset."""
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
    audio_type = params.get("audio_type", "music")
    try:
        job.status = GenerationJob.Status.PROCESSING
        job.save(update_fields=["status"])
        prompt = (params.get("prompt") or "").strip()
        if not prompt:
            raise RuntimeError("No prompt provided.")
        length = params.get("length")
        if audio_type == "music":
            audio = elevenlabs.generate_music(prompt, int(length * 1000) if length else None)
        else:
            audio = elevenlabs.generate_sound_effect(prompt, float(length) if length else None)
    except Exception as exc:  # provider/network failure
        job.status = GenerationJob.Status.FAILED
        job.error = str(exc)[:1000]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    asset = Asset(
        user=job.user,
        source=Asset.Source.GENERATED,
        type=Asset.Type.AUDIO,
        mime="audio/mpeg",
        name=("Music" if audio_type == "music" else "Sound effect"),
        job_id=job.id,
    )
    asset.file.save(f"{audio_type}_{job.id}.mp3", ContentFile(audio), save=True)

    cost = credits.COST["music" if audio_type == "music" else "sfx"]
    job.output_asset_ids = [str(asset.id)]
    job.status = GenerationJob.Status.SUCCEEDED
    job.credits_cost = cost
    job.completed_at = timezone.now()
    job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
    credits.record(job.user, -cost, f"{audio_type}_generation", job.id)


def _asset_to_temp(asset: Asset, tmpdir: str, fallback_ext: str, name: str | None = None) -> str:
    """Copy an Asset's bytes to a temp file (keeping its extension) for FFmpeg.

    FFmpeg needs real filesystem paths; this stays storage-agnostic by streaming
    the file out of whatever backend (local/S3) holds it. `name` makes the temp
    filename unique when the same Asset is used for more than one clip.
    """
    ext = os.path.splitext(asset.file.name)[1] or fallback_ext
    path = os.path.join(tmpdir, f"{name or asset.id}{ext}")
    with asset.file.open("rb") as src, open(path, "wb") as dst:
        shutil.copyfileobj(src, dst)
    return path


@shared_task
def run_edit_render(job_id: str):
    """Trim a source video and apply an optional voiceover (FFmpeg), then store it."""
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

        # Clips sequence (with a fallback to the legacy single-source shape).
        clips_param = params.get("clips")
        if not clips_param and params.get("source"):
            clips_param = [{
                "source": params["source"],
                "trim_start": params.get("trim_start", 0.0),
                "trim_end": params.get("trim_end"),
            }]
        if not clips_param:
            raise RuntimeError("No clips to render.")

        resolved = []
        for c in clips_param:
            asset = Asset.objects.filter(
                id=c.get("source"), user=job.user, type=Asset.Type.VIDEO
            ).first()
            if not asset or not asset.file:
                raise RuntimeError("A source clip was not found.")
            resolved.append((asset, c))

        voiceover = None
        vo_id = params.get("voiceover")
        if vo_id:
            voiceover = Asset.objects.filter(
                id=vo_id, user=job.user, type=Asset.Type.AUDIO
            ).first()
            if not voiceover or not voiceover.file:
                raise RuntimeError("Selected voiceover was not found.")

        # Music / SFX layers (each an owned audio Asset).
        resolved_layers = []
        for L in params.get("audio_layers") or []:
            la = Asset.objects.filter(
                id=L.get("source"), user=job.user, type=Asset.Type.AUDIO
            ).first()
            if la and la.file:
                resolved_layers.append((la, L))

        with tempfile.TemporaryDirectory() as tmp:
            clip_inputs = []
            for idx, (asset, c) in enumerate(resolved):
                path = _asset_to_temp(asset, tmp, ".mp4", name=f"src_{idx}_{asset.id}")
                clip_inputs.append({
                    "path": path,
                    "start": c.get("trim_start") or 0.0,
                    "end": c.get("trim_end"),
                })
            vo_path = _asset_to_temp(voiceover, tmp, ".wav") if voiceover else None
            layer_inputs = []
            for idx, (la, L) in enumerate(resolved_layers):
                lpath = _asset_to_temp(la, tmp, ".mp3", name=f"layer_{idx}_{la.id}")
                layer_inputs.append({
                    "path": lpath,
                    "offset": L.get("offset") or 0.0,
                    "volume": L.get("volume") if L.get("volume") is not None else 0.5,
                })
            out_path = os.path.join(tmp, f"edit_{job.id}.mp4")

            ffmpeg.render_edit(
                clips=clip_inputs,
                output_path=out_path,
                workdir=tmp,
                voiceover_path=vo_path,
                vo_mode=params.get("voiceover_mode", "keep"),
                vo_offset=params.get("voiceover_offset") or 0.0,
                layers=layer_inputs,
            )

            with open(out_path, "rb") as fh:
                data = fh.read()
            asset = Asset(
                user=job.user,
                source=Asset.Source.GENERATED,
                type=Asset.Type.VIDEO,
                mime="video/mp4",
                job_id=job.id,
            )
            asset.file.save(f"edit_{job.id}.mp4", ContentFile(data), save=True)
    except Exception as exc:  # processing/ffmpeg failure
        job.status = GenerationJob.Status.FAILED
        job.error = str(exc)[:1000]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])
        return

    cost = credits.COST["edit"]
    job.output_asset_ids = [str(asset.id)]
    job.status = GenerationJob.Status.SUCCEEDED
    job.credits_cost = cost
    job.completed_at = timezone.now()
    job.save(update_fields=["output_asset_ids", "status", "credits_cost", "completed_at"])
    credits.record(job.user, -cost, "edit_render", job.id)

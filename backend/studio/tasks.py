from celery import shared_task

from providers import elevenlabs, higgsfield

from .models import Asset, Character, Voice

# Non-blocking poll: one quick HTTP check, then reschedule. Higgsfield can leave a
# reference "queued" for a while, so allow a generous total deadline.
_POLL_INTERVAL = 10            # seconds between status checks
_POLL_MAX_ATTEMPTS = 240      # ~40 minutes total (240 * 10s)


def _asset_hf_url(asset: Asset) -> str | None:
    """Higgsfield-hosted URL for an uploaded image (uploaded + cached once)."""
    if not asset.file:
        return None
    if asset.higgsfield_url:
        return asset.higgsfield_url
    with asset.file.open("rb") as fh:
        data = fh.read()
    url = higgsfield.upload_reference(data, asset.mime or "image/png")
    asset.higgsfield_url = url
    asset.save(update_fields=["higgsfield_url"])
    return url


@shared_task
def create_and_poll_reference(character_id: str):
    """Create a Higgsfield custom-reference (SoulId) from the character's training
    images, then hand off to a non-blocking poller."""
    try:
        char = Character.objects.get(id=character_id)
    except Character.DoesNotExist:
        return

    try:
        assets = Asset.objects.filter(id__in=char.training_asset_ids, user=char.user)
        by_id = {str(a.id): a for a in assets}
        urls = []
        for aid in char.training_asset_ids:
            asset = by_id.get(aid)
            url = _asset_hf_url(asset) if asset else None
            if url:
                urls.append(url)
        if not urls:
            raise RuntimeError("No training images available.")

        record = higgsfield.create_custom_reference(char.name, urls)
        char.provider_character_id = record.get("id", "")
        char.save(update_fields=["provider_character_id"])
    except Exception as exc:
        char.status = Character.Status.FAILED
        char.error = str(exc)[:1000]
        char.save(update_fields=["status", "error"])
        return

    poll_reference.delay(character_id, 0)


@shared_task
def poll_reference(character_id: str, attempt: int = 0):
    """Check a custom-reference's training status once, then finalize the Character
    or reschedule. Each run is a single quick HTTP call, so a slow Higgsfield queue
    never ties up a worker slot."""
    try:
        char = Character.objects.get(id=character_id)
    except Character.DoesNotExist:
        return
    if char.status != Character.Status.PENDING or not char.provider_character_id:
        return  # already resolved (or no reference to poll)

    try:
        state = higgsfield.get_custom_reference(char.provider_character_id)
    except Exception:
        state = None

    if state is not None:
        status = str(state.get("status", "")).lower()
        if status in higgsfield.READY_STATUSES:
            char.status = Character.Status.READY
            thumb = state.get("thumbnail_url")
            if thumb:
                char.thumbnail_url = thumb
            char.save(update_fields=["status", "thumbnail_url"])
            return
        if status in higgsfield.FAILED_STATUSES:
            char.status = Character.Status.FAILED
            char.error = f"Training {status}."
            char.save(update_fields=["status", "error"])
            return

    if attempt + 1 >= _POLL_MAX_ATTEMPTS:
        char.status = Character.Status.FAILED
        char.error = "Training is taking unusually long on Higgsfield's side — please try again."
        char.save(update_fields=["status", "error"])
        return

    poll_reference.apply_async(args=[character_id, attempt + 1], countdown=_POLL_INTERVAL)


@shared_task
def run_voice_clone(voice_id: str):
    """Clone a voice at ElevenLabs from the uploaded sample. The clone is
    synchronous (returns a voice_id immediately), so there's nothing to poll —
    mark ready on success, failed on error."""
    try:
        voice = Voice.objects.get(id=voice_id)
    except Voice.DoesNotExist:
        return

    try:
        if not voice.sample:
            raise RuntimeError("No voice sample available.")
        with voice.sample.open("rb") as fh:
            data = fh.read()
        provider_id = elevenlabs.clone_voice(
            voice.name, data, voice.mime or "audio/mpeg",
            filename=voice.sample.name.rsplit("/", 1)[-1] or "sample",
        )
        voice.provider_voice_id = provider_id
        voice.status = Voice.Status.READY
        voice.save(update_fields=["provider_voice_id", "status"])
    except Exception as exc:
        voice.status = Voice.Status.FAILED
        voice.error = str(exc)[:1000]
        voice.save(update_fields=["status", "error"])

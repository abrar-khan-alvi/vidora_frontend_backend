import uuid

from django.conf import settings
from django.db import models


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects"
    )
    title = models.CharField(max_length=200, blank=True)
    kind = models.CharField(max_length=20, default="image")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Project {self.id}"


class Asset(models.Model):
    class Type(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"

    class Source(models.TextChoices):
        UPLOAD = "upload", "Upload"
        GENERATED = "generated", "Generated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assets"
    )
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="assets"
    )
    # Human-friendly label (auto-generated on upload, user-renameable). Powers the
    # reusable reference library and the @-mention picker.
    name = models.CharField(max_length=120, blank=True)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.IMAGE)
    source = models.CharField(max_length=12, choices=Source.choices)
    file = models.ImageField(
        upload_to="assets/%Y/%m/", null=True, blank=True,
        width_field="width", height_field="height",
    )
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    mime = models.CharField(max_length=100, blank=True)
    # SHA-256 of the file bytes — lets uploads dedup against an existing reference
    # so the same image isn't stored twice per user.
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    # Cached Higgsfield-hosted URL for this image, so a reused reference isn't
    # re-uploaded to the provider on every generation.
    higgsfield_url = models.URLField(max_length=500, blank=True)
    # Loose link to the GenerationJob that produced this asset (avoids a cross-app FK).
    job_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type} asset {self.id}"

    @property
    def url(self):
        return self.file.url if self.file else ""


class Character(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="characters"
    )
    name = models.CharField(max_length=120)
    # Higgsfield custom-reference (SoulId) UUID, used as `style_id` at generation.
    provider_character_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    training_asset_ids = models.JSONField(default=list)
    thumbnail_url = models.URLField(max_length=500, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"


class Publication(models.Model):
    """A finished video the user has "published" — i.e. made shareable.

    Holds a public share token so anyone with the link can view the video
    without an account (the publish step of the creator flow)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="publications"
    )
    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE, related_name="publications"
    )
    title = models.CharField(max_length=200, blank=True)
    # Opaque public handle for the share link (no auth needed to view).
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Publication {self.id} ({self.title or 'Untitled'})"


class Voice(models.Model):
    """A cloned voice (VoiceSync AI). Mirrors Character: created from an uploaded
    audio sample, cloned at the provider (ElevenLabs), then reusable for TTS."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="voices"
    )
    name = models.CharField(max_length=120)
    provider = models.CharField(max_length=32, default="elevenlabs")
    # Provider voice id (ElevenLabs voice_id), used when generating speech.
    provider_voice_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    # The uploaded sample clip the voice was cloned from (for playback / re-clone).
    sample = models.FileField(upload_to="voices/%Y/%m/", null=True, blank=True)
    mime = models.CharField(max_length=100, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"

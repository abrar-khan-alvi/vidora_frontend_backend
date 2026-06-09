import uuid

from django.conf import settings
from django.db import models


class GenerationJob(models.Model):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        EDIT = "edit", "Edit"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SUBMITTED = "submitted", "Submitted"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    TERMINAL = {Status.SUCCEEDED, Status.FAILED, Status.CANCELED}

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="generation_jobs"
    )
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.IMAGE)
    provider = models.CharField(max_length=32, default="higgsfield")
    provider_job_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.QUEUED)
    input_params = models.JSONField(default=dict)
    output_asset_ids = models.JSONField(default=list)
    credits_cost = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} job {self.id} ({self.status})"


class CreditLedger(models.Model):
    """Append-only credit movements. Balance = SUM(delta). Enforcement comes with billing."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credit_entries"
    )
    delta = models.IntegerField()
    reason = models.CharField(max_length=64)
    ref_job = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

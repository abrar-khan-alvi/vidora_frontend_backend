import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Email-based user. `is_active` flips to True after email verification."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True)

    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class OneTimeCode(models.Model):
    """A short-lived numeric code emailed for signup verification or password reset."""

    class Purpose(models.TextChoices):
        SIGNUP = "signup", "Signup verification"
        PASSWORD_RESET = "password_reset", "Password reset"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="codes")
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=32, choices=Purpose.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose", "consumed_at"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.purpose} code for {self.user.email}"

    @classmethod
    def issue(cls, user, purpose):
        """Invalidate any outstanding codes for this purpose and create a fresh one."""
        cls.objects.filter(
            user=user, purpose=purpose, consumed_at__isnull=True
        ).update(consumed_at=timezone.now())

        ttl = getattr(settings, "OTP_TTL_MINUTES", 10)
        return cls.objects.create(
            user=user,
            code=f"{secrets.randbelow(100000):05d}",
            purpose=purpose,
            expires_at=timezone.now() + timedelta(minutes=ttl),
        )

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def is_valid(self):
        return self.consumed_at is None and not self.is_expired

    def consume(self):
        self.consumed_at = timezone.now()
        self.save(update_fields=["consumed_at"])

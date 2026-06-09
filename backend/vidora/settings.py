"""Django settings for the Vidora backend."""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(key, default=False):
    return os.getenv(key, str(default)).lower() in ("1", "true", "yes", "on")


def env_list(key, default=""):
    return [item.strip() for item in os.getenv(key, default).split(",") if item.strip()]


# --- Core -------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-change-me")
DEBUG = env_bool("DEBUG", True)
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "*")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    # Local
    "accounts",
    "prompton",
    "studio",
    "generation",
    "billing",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # Serves Django's own static files (the admin) in production.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "vidora.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "vidora.wsgi.application"

# --- Database ---------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "vidora"),
        "USER": os.getenv("POSTGRES_USER", "vidora"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "vidora"),
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# --- Auth -------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- DRF / JWT --------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("REFRESH_TOKEN_DAYS", "7"))),
}

# --- CORS / CSRF ------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
# Hosts allowed to POST to the Django admin / session endpoints over HTTPS.
# In prod set e.g. "https://api.yourdomain.com,https://app.yourdomain.com".
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "")

# --- Email -------------------------------------------------------------------
# If EMAIL_HOST is set we send over SMTP; otherwise codes print to the console.
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "15"))
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "Vidora <no-reply@vidora.local>")

EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if EMAIL_HOST
    else "django.core.mail.backends.console.EmailBackend"
)

# One-time email code lifetime
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10"))

# --- AI providers -----------------------------------------------------------
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
HIGGSFIELD_API_KEY = os.getenv("HIGGSFIELD_API_KEY", "")
HIGGSFIELD_API_SECRET = os.getenv("HIGGSFIELD_API_SECRET", "")

# Prompton assistant model (override via env; claude-haiku-4-5 for lower cost).
PROMPTON_MODEL = os.getenv("PROMPTON_MODEL", "claude-sonnet-4-6")

# Higgsfield Soul image models. Endpoint shape: higgsfield-ai/soul/<mode>,
# mode in {standard, reference, character}. Valid resolutions: "720p" | "1080p".
#   - standard:  text-only prompt.
#   - reference: prompt + user-supplied reference image URLs (input_images).
HIGGSFIELD_IMAGE_APP = os.getenv("HIGGSFIELD_IMAGE_APP", "higgsfield-ai/soul/standard")
HIGGSFIELD_IMAGE_APP_REFERENCE = os.getenv(
    "HIGGSFIELD_IMAGE_APP_REFERENCE", "higgsfield-ai/soul/reference"
)
HIGGSFIELD_IMAGE_RESOLUTION = os.getenv("HIGGSFIELD_IMAGE_RESOLUTION", "1080p")
# Max reference images a user may attach to one image job.
HIGGSFIELD_MAX_REFERENCES = int(os.getenv("HIGGSFIELD_MAX_REFERENCES", "4"))

# Higgsfield video (DoP image-to-video). Slug = <base>/<quality> for a single source
# frame, or <base>/<quality>/first-last-frame when an end frame is supplied.
# quality in {lite, standard, turbo}. Kling / Minimax Hailuo are also enabled alternatives.
HIGGSFIELD_VIDEO_APP_BASE = os.getenv("HIGGSFIELD_VIDEO_APP_BASE", "higgsfield-ai/dop")
HIGGSFIELD_VIDEO_QUALITY = os.getenv("HIGGSFIELD_VIDEO_QUALITY", "turbo")
HIGGSFIELD_VIDEO_FLF_SUFFIX = os.getenv("HIGGSFIELD_VIDEO_FLF_SUFFIX", "first-last-frame")

# --- ElevenLabs (VoiceSync AI: voice cloning + TTS) -------------------------
# Higgsfield's API exposes no voice/TTS, so cloning + speech come from ElevenLabs.
# Auth header is `xi-api-key`. Cloning requires a paid tier (Starter+).
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_BASE_URL = os.getenv("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io")
ELEVENLABS_TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")

# --- I18N / Static ----------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media (user uploads + generated assets). Dev: local volume; prod: S3 + CloudFront.
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Static files (Django admin) are served by WhiteNoise from STATIC_ROOT.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

# When USE_S3 is on, user uploads + generated assets go to S3 and are served
# over your CloudFront domain. Credentials are optional here — on EC2 they're
# picked up from the instance's IAM role (the preferred, key-less setup).
USE_S3 = env_bool("USE_S3", False)
if USE_S3:
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME")
    AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN")  # e.g. media.yourdomain.com
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID") or None
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY") or None
    AWS_QUERYSTRING_AUTH = False  # public, CDN-cacheable URLs
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "public, max-age=86400"}
    STORAGES["default"] = {"BACKEND": "storages.backends.s3.S3Storage"}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Production security (active when DEBUG is off) -------------------------
# Behind nginx + Cloudflare, trust the forwarded protocol so Django knows the
# request arrived over HTTPS (for secure cookies, redirects, absolute URLs).
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", False)
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
    SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)

# --- Celery -----------------------------------------------------------------
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1")
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_TASK_TRACK_STARTED = True

# --- Stripe (Billing & Subscriptions) ---------------------------------------
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


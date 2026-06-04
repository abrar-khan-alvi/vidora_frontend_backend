from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

# Per-purpose copy for the OTP email.
_MESSAGES = {
    "signup": {
        "subject": "Verify your Vidora account",
        "heading": "Confirm your email",
        "intro": "Use the code below to finish setting up your Vidora account.",
        "preheader": "Your Vidora verification code",
    },
    "password_reset": {
        "subject": "Reset your Vidora password",
        "heading": "Reset your password",
        "intro": "Use the code below to reset the password for your Vidora account.",
        "preheader": "Your Vidora password reset code",
    },
}

_FALLBACK = {
    "subject": "Your Vidora code",
    "heading": "Your verification code",
    "intro": "Use the code below to continue.",
    "preheader": "Your Vidora code",
}


def send_code_email(user, code_obj):
    """Render and send the branded one-time-code email (HTML + plain text)."""
    cfg = _MESSAGES.get(code_obj.purpose, _FALLBACK)
    context = {
        "code": code_obj.code,
        "ttl_minutes": settings.OTP_TTL_MINUTES,
        "heading": cfg["heading"],
        "intro": cfg["intro"],
        "preheader": cfg["preheader"],
        "display_name": user.display_name,
    }

    text_body = render_to_string("emails/otp_code.txt", context)
    html_body = render_to_string("emails/otp_code.html", context)

    message = EmailMultiAlternatives(
        subject=cfg["subject"],
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send()

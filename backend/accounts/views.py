from django.contrib.auth import get_user_model
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_code_email
from .models import OneTimeCode
from .serializers import (
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailSerializer,
    VerifyResetCodeSerializer,
)

User = get_user_model()

# Signed, time-limited token handed to the client between "verify reset code"
# and "set new password" so the final step proves the code was checked.
_RESET_SIGNER = TimestampSigner(salt="accounts.password-reset")
_RESET_TOKEN_MAX_AGE = 10 * 60  # seconds


def _latest_valid_code(user, purpose, code):
    if user is None:
        return None
    match = (
        user.codes.filter(purpose=purpose, code=code, consumed_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    return match if match and match.is_valid() else None


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        code = OneTimeCode.issue(user, OneTimeCode.Purpose.SIGNUP)
        send_code_email(user, code)

        return Response(
            {
                "detail": "Account created. Check your email for the verification code.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        code = _latest_valid_code(user, OneTimeCode.Purpose.SIGNUP, serializer.validated_data["code"])
        if code is None:
            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code.consume()
        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        return Response({"detail": "Email verified. You can now sign in."})


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET the current user, or PATCH editable profile fields (display name)."""

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        return ProfileUpdateSerializer if self.request.method in ("PATCH", "PUT") else UserSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        # Always return the full user representation (with request context so the
        # avatar URL is absolute).
        return Response(UserSerializer(self.get_object(), context={"request": request}).data)


class ChangePasswordView(APIView):
    """Authenticated password change (verifies the current password)."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ).first()
        if user is not None:
            code = OneTimeCode.issue(user, OneTimeCode.Purpose.PASSWORD_RESET)
            send_code_email(user, code)

        # Always 200 — don't reveal whether the email is registered.
        return Response(
            {"detail": "If an account exists for that email, a reset code has been sent."}
        )


class VerifyResetCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyResetCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        code = _latest_valid_code(
            user, OneTimeCode.Purpose.PASSWORD_RESET, serializer.validated_data["code"]
        )
        if code is None:
            return Response(
                {"detail": "Invalid or expired reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code.consume()
        reset_token = _RESET_SIGNER.sign(str(user.id))
        return Response({"reset_token": reset_token})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user_id = _RESET_SIGNER.unsign(
                serializer.validated_data["reset_token"], max_age=_RESET_TOKEN_MAX_AGE
            )
        except SignatureExpired:
            return Response(
                {"detail": "Your reset session expired. Please start again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except BadSignature:
            return Response(
                {"detail": "Invalid reset token."}, status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(id=user_id).first()
        if user is None:
            return Response(
                {"detail": "Invalid reset token."}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now sign in."})

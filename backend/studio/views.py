import hashlib
import os

from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Asset, Character, Voice
from .serializers import (
    AssetRenameSerializer,
    AssetSerializer,
    AssetUploadSerializer,
    CharacterCreateSerializer,
    CharacterSerializer,
    VoiceCreateSerializer,
    VoiceRenameSerializer,
    VoiceSerializer,
)


def _auto_name(user, filename: str) -> str:
    """Friendly default label from the upload filename, else 'Reference N'."""
    base = os.path.splitext(filename or "")[0].strip()
    if base:
        return base[:120]
    count = Asset.objects.filter(user=user, source=Asset.Source.UPLOAD).count()
    return f"Reference {count + 1}"


class AssetUploadView(generics.CreateAPIView):
    """Upload a reference image (multipart). Dedups by content hash and
    auto-names. Dev: stored in MEDIA; prod (AWS): S3."""

    serializer_class = AssetUploadSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["file"]

        data = upload.read()
        upload.seek(0)
        digest = hashlib.sha256(data).hexdigest()

        # Same image already in this user's library? Reuse it.
        existing = Asset.objects.filter(
            user=request.user, source=Asset.Source.UPLOAD, content_hash=digest
        ).first()
        if existing:
            out = AssetSerializer(existing, context=self.get_serializer_context()).data
            return Response(out, status=status.HTTP_200_OK)

        asset = serializer.save(
            user=request.user,
            source=Asset.Source.UPLOAD,
            type=Asset.Type.IMAGE,
            mime=getattr(upload, "content_type", "") or "",
            name=_auto_name(request.user, getattr(upload, "name", "")),
            content_hash=digest,
        )
        out = AssetSerializer(asset, context=self.get_serializer_context()).data
        return Response(out, status=status.HTTP_201_CREATED)


class ReferenceListView(generics.ListAPIView):
    """The user's reusable reference-image library (uploaded images only)."""

    serializer_class = AssetSerializer

    def get_queryset(self):
        return Asset.objects.filter(
            user=self.request.user,
            source=Asset.Source.UPLOAD,
            type=Asset.Type.IMAGE,
        )


class AssetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Rename (PATCH) or remove (DELETE) a library reference."""

    def get_queryset(self):
        return Asset.objects.filter(user=self.request.user, source=Asset.Source.UPLOAD)

    def get_serializer_class(self):
        return AssetRenameSerializer if self.request.method in ("PATCH", "PUT") else AssetSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        asset = self.get_object()
        return Response(AssetSerializer(asset, context=self.get_serializer_context()).data)


class CharacterListCreateView(generics.ListCreateAPIView):
    """List trained references, or create one from uploaded library images."""

    def get_queryset(self):
        return Character.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return CharacterCreateSerializer if self.request.method == "POST" else CharacterSerializer

    def create(self, request, *args, **kwargs):
        serializer = CharacterCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        # Only accept the user's own uploaded images.
        ids = [str(x) for x in d["asset_ids"]]
        owned = set(
            str(a.id)
            for a in Asset.objects.filter(
                id__in=ids, user=request.user, source=Asset.Source.UPLOAD
            )
        )
        valid = [i for i in ids if i in owned]
        if not valid:
            return Response({"asset_ids": ["No valid images."]}, status=status.HTTP_400_BAD_REQUEST)

        character = Character.objects.create(
            user=request.user,
            name=d["name"],
            status=Character.Status.PENDING,
            training_asset_ids=valid,
        )

        from .tasks import create_and_poll_reference
        create_and_poll_reference.delay(str(character.id))

        return Response(
            CharacterSerializer(character).data, status=status.HTTP_201_CREATED
        )


class CharacterDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = CharacterSerializer

    def get_queryset(self):
        return Character.objects.filter(user=self.request.user)


class VoiceListCreateView(generics.ListCreateAPIView):
    """List the user's cloned voices, or clone a new one from an audio sample."""

    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Voice.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return VoiceCreateSerializer if self.request.method == "POST" else VoiceSerializer

    def create(self, request, *args, **kwargs):
        serializer = VoiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        sample = d["sample"]

        voice = Voice.objects.create(
            user=request.user,
            name=d["name"],
            status=Voice.Status.PENDING,
            mime=getattr(sample, "content_type", "") or "",
        )
        voice.sample.save(getattr(sample, "name", "sample"), sample, save=True)

        from .tasks import run_voice_clone
        run_voice_clone.delay(str(voice.id))

        return Response(
            VoiceSerializer(voice, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class VoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Rename (PATCH) or delete (DELETE, also removes the voice at the provider)."""

    def get_queryset(self):
        return Voice.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return VoiceRenameSerializer if self.request.method in ("PATCH", "PUT") else VoiceSerializer

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        super().update(request, *args, **kwargs)
        voice = self.get_object()
        return Response(VoiceSerializer(voice, context=self.get_serializer_context()).data)

    def perform_destroy(self, instance):
        if instance.provider_voice_id:
            try:
                from providers import elevenlabs
                elevenlabs.delete_voice(instance.provider_voice_id)
            except Exception:
                pass  # best-effort; still remove locally
        instance.delete()

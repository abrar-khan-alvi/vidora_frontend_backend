import hashlib
import os

from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Asset, Character
from .serializers import (
    AssetRenameSerializer,
    AssetSerializer,
    AssetUploadSerializer,
    CharacterSerializer,
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


class CharacterListView(generics.ListAPIView):
    serializer_class = CharacterSerializer

    def get_queryset(self):
        return Character.objects.filter(user=self.request.user)

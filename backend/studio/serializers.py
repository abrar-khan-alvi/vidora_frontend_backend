from rest_framework import serializers

from .models import Asset, Character, Publication, Voice


class AssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = ("id", "name", "type", "source", "url", "width", "height", "created_at")
        read_only_fields = fields

    def get_url(self, obj):
        if not obj.file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class AssetUploadSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = ("id", "name", "type", "source", "url", "width", "height", "created_at", "file")
        read_only_fields = ("id", "name", "type", "source", "url", "width", "height", "created_at")
        extra_kwargs = {"file": {"write_only": True, "required": True}}

    def get_url(self, obj):
        if not obj.file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class MediaUploadSerializer(serializers.Serializer):
    """Upload a video or audio clip for the editor (multipart).

    A plain Serializer (not ModelSerializer) so the file isn't validated as an
    image — Asset.file is an ImageField, but it stores arbitrary media bytes.
    """

    file = serializers.FileField()


class AssetRenameSerializer(serializers.ModelSerializer):
    """Rename a library reference (the only user-editable field)."""

    class Meta:
        model = Asset
        fields = ("name",)
        extra_kwargs = {"name": {"required": True, "allow_blank": False, "max_length": 120}}


class CharacterSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = ("id", "name", "status", "thumbnail_url", "error", "created_at")
        read_only_fields = fields

    def get_thumbnail_url(self, obj):
        if obj.thumbnail_url:
            return obj.thumbnail_url
        if obj.training_asset_ids and len(obj.training_asset_ids) > 0:
            try:
                first_asset_id = obj.training_asset_ids[0]
                asset = Asset.objects.filter(id=first_asset_id).first()
                if asset and asset.file:
                    request = self.context.get("request")
                    return request.build_absolute_uri(asset.file.url) if request else asset.file.url
            except Exception:
                pass
        return ""


class CharacterCreateSerializer(serializers.Serializer):
    """Create a trained reference from 1–6 uploaded library images."""

    name = serializers.CharField(max_length=120)
    asset_ids = serializers.ListField(
        child=serializers.UUIDField(), min_length=1, max_length=6,
    )


class VoiceSerializer(serializers.ModelSerializer):
    sample_url = serializers.SerializerMethodField()

    class Meta:
        model = Voice
        fields = ("id", "name", "status", "provider", "sample_url", "error", "created_at")
        read_only_fields = fields

    def get_sample_url(self, obj):
        if not obj.sample:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.sample.url) if request else obj.sample.url


class VoiceCreateSerializer(serializers.Serializer):
    """Clone a voice from an uploaded audio sample (multipart)."""

    name = serializers.CharField(max_length=120)
    sample = serializers.FileField()


class VoiceRenameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voice
        fields = ("name",)
        extra_kwargs = {"name": {"required": True, "allow_blank": False, "max_length": 120}}


class PublicationSerializer(serializers.ModelSerializer):
    """A published (shareable) video — used both for the owner's list and the
    public share view."""

    video_url = serializers.SerializerMethodField()
    share_token = serializers.UUIDField(read_only=True)

    class Meta:
        model = Publication
        fields = ("id", "title", "share_token", "video_url", "created_at")
        read_only_fields = fields

    def get_video_url(self, obj):
        if not obj.asset or not obj.asset.file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.asset.file.url) if request else obj.asset.file.url


class PublicationCreateSerializer(serializers.Serializer):
    """Publish a finished video Asset (makes it shareable)."""

    asset_id = serializers.UUIDField()
    title = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")

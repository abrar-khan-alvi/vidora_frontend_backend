from rest_framework import serializers

from .models import Asset, Character, Voice


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


class AssetRenameSerializer(serializers.ModelSerializer):
    """Rename a library reference (the only user-editable field)."""

    class Meta:
        model = Asset
        fields = ("name",)
        extra_kwargs = {"name": {"required": True, "allow_blank": False, "max_length": 120}}


class CharacterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Character
        fields = ("id", "name", "status", "thumbnail_url", "error", "created_at")
        read_only_fields = fields


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

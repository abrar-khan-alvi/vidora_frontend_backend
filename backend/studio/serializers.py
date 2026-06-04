from rest_framework import serializers

from .models import Asset, Character


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
        fields = ("id", "name", "status", "provider_character_id", "created_at")
        read_only_fields = fields

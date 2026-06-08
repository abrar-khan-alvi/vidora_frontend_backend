from rest_framework import serializers

from studio.models import Asset

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "role", "content", "attachments", "created_at")
        read_only_fields = fields

    def get_attachments(self, obj):
        ids = obj.attachments or []
        if not ids:
            return []
        request = self.context.get("request")
        by_id = {str(a.id): a for a in Asset.objects.filter(id__in=ids)}
        out = []
        for i in ids:
            asset = by_id.get(str(i))
            if not asset or not asset.file:
                continue
            url = request.build_absolute_uri(asset.file.url) if request else asset.file.url
            out.append({"id": str(asset.id), "url": url})
        return out


class ConversationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at")
        read_only_fields = fields


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at", "messages")
        read_only_fields = fields


class StreamInputSerializer(serializers.Serializer):
    content = serializers.CharField(trim_whitespace=False, allow_blank=True, required=False, default="")
    attachment_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list, max_length=4,
    )

    def validate(self, data):
        if not (data.get("content") or "").strip() and not data.get("attachment_ids"):
            raise serializers.ValidationError("Type a message or attach an image.")
        return data

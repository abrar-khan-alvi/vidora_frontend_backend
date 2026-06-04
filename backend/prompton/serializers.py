from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "created_at")
        read_only_fields = fields


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
    content = serializers.CharField(trim_whitespace=False)

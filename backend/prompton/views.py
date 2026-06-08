import base64
import json

from django.http import StreamingHttpResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from studio.models import Asset

from .models import Conversation, Message
from .provider import stream_reply
from .serializers import (
    ConversationDetailSerializer,
    ConversationListSerializer,
    StreamInputSerializer,
)

# Image media types the Anthropic vision API accepts.
_VISION_MEDIA = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def _sse(payload: dict) -> str:
    # Pad to force Django runserver WSGI buffer to flush immediately.
    # The frontend ignores the extra whitespace.
    padding = " " * 2048
    return f"data: {json.dumps(payload)}\n\n{padding}"


def _image_block(asset: Asset) -> dict | None:
    """Build an Anthropic base64 image block from a stored Asset.

    We send base64 (not a URL) because the app's media files aren't publicly
    reachable by Anthropic's servers in dev.
    """
    if not asset.file:
        return None
    try:
        with asset.file.open("rb") as fh:
            data = fh.read()
    except Exception:
        return None
    media_type = asset.mime if asset.mime in _VISION_MEDIA else "image/png"
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": base64.standard_b64encode(data).decode("ascii"),
        },
    }


def _history_for_api(conversation, user):
    """Serialize the conversation into Anthropic `messages`, expanding any image
    attachments on user turns into vision blocks (images first, then text)."""
    history = []
    for m in conversation.messages.all():
        ids = m.attachments if (m.role == Message.Role.USER and m.attachments) else []
        if ids:
            assets = {str(a.id): a for a in Asset.objects.filter(id__in=ids, user=user)}
            blocks = []
            for i in ids:
                asset = assets.get(str(i))
                block = _image_block(asset) if asset else None
                if block:
                    blocks.append(block)
            # Claude requires non-empty text alongside images.
            blocks.append({"type": "text", "text": m.content or "(image attached)"})
            history.append({"role": m.role, "content": blocks})
        else:
            history.append({"role": m.role, "content": m.content})
    return history


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationListSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ConversationDetailSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)


class StreamMessageView(APIView):
    """POST a user message; stream the assistant reply back as SSE."""

    def post(self, request, pk):
        conversation = Conversation.objects.filter(user=request.user, pk=pk).first()
        if conversation is None:
            return Response(
                {"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StreamInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        # Keep only attachments that are this user's image assets.
        attachment_ids = [str(i) for i in serializer.validated_data.get("attachment_ids", [])]
        if attachment_ids:
            valid = Asset.objects.filter(
                id__in=attachment_ids, user=request.user, type=Asset.Type.IMAGE
            ).values_list("id", flat=True)
            attachment_ids = [str(i) for i in valid]

        # Persist the user message before streaming so it survives a failed reply.
        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=content,
            attachments=attachment_ids,
        )
        if not conversation.title:
            conversation.title = (content[:80] or "Image chat")
            conversation.save(update_fields=["title", "updated_at"])

        history = _history_for_api(conversation, request.user)

        def event_stream():
            chunks = []
            try:
                for kind, payload in stream_reply(history):
                    if kind == "delta":
                        chunks.append(payload)
                        yield _sse({"type": "delta", "text": payload})
                    elif kind == "final":
                        usage = getattr(payload, "usage", None)
                        Message.objects.create(
                            conversation=conversation,
                            role=Message.Role.ASSISTANT,
                            content="".join(chunks),
                            input_tokens=getattr(usage, "input_tokens", 0) or 0,
                            output_tokens=getattr(usage, "output_tokens", 0) or 0,
                        )
                        conversation.save(update_fields=["updated_at"])
                        yield _sse({"type": "done"})
            except Exception as exc:  # surface provider errors to the client
                yield _sse({"type": "error", "message": str(exc)})

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

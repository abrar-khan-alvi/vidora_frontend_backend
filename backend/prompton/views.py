import json

from django.http import StreamingHttpResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .provider import stream_reply
from .serializers import (
    ConversationDetailSerializer,
    ConversationListSerializer,
    StreamInputSerializer,
)


def _sse(payload: dict) -> str:
    # Pad to force Django runserver WSGI buffer to flush immediately.
    # The frontend ignores the extra whitespace.
    padding = " " * 2048
    return f"data: {json.dumps(payload)}\n\n{padding}"


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

        # Persist the user message before streaming so it survives a failed reply.
        Message.objects.create(
            conversation=conversation, role=Message.Role.USER, content=content
        )
        if not conversation.title:
            conversation.title = content[:80]
            conversation.save(update_fields=["title", "updated_at"])

        history = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages.all()
        ]

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

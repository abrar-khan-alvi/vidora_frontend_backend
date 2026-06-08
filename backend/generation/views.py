from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from providers import higgsfield

from .models import GenerationJob
from .serializers import (
    CreateImageJobSerializer,
    CreateTTSJobSerializer,
    CreateUGCJobSerializer,
    CreateVideoJobSerializer,
    GenerationJobSerializer,
)
from .credits import can_afford


class GenerationListCreateView(generics.ListCreateAPIView):
    serializer_class = GenerationJobSerializer

    def get_queryset(self):
        qs = GenerationJob.objects.filter(user=self.request.user)
        kind = self.request.query_params.get("kind")
        return qs.filter(kind=kind) if kind else qs

    def create(self, request, *args, **kwargs):
        if not can_afford(request.user, "image"):
            return Response(
                {"error": "Insufficient credits to generate an image. Please top up or upgrade your subscription."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        serializer = CreateImageJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        params = {
            "prompt": d["prompt"],
            "aspect": d.get("aspect", "1:1"),
            "num_outputs": d.get("num_outputs", 1),
            "seed": d.get("seed"),
            "reference": str(d["reference"]) if d.get("reference") else None,
            "reference_strength": d.get("reference_strength", 1.0),
            "style": str(d["style"]) if d.get("style") else None,
            "style_strength": d.get("style_strength", 1.0),
        }
        job = GenerationJob.objects.create(
            user=request.user,
            kind=GenerationJob.Kind.IMAGE,
            provider="higgsfield",
            status=GenerationJob.Status.QUEUED,
            input_params=params,
        )

        from .tasks import run_image_generation
        run_image_generation.delay(str(job.id))

        return Response(
            GenerationJobSerializer(job, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


class VideoGenerationCreateView(generics.CreateAPIView):
    """Create an image-to-video job (DoP). Source frame required; end frame optional."""

    serializer_class = CreateVideoJobSerializer

    def create(self, request, *args, **kwargs):
        if not can_afford(request.user, "video"):
            return Response(
                {"error": "Insufficient credits to generate a video. Please top up or upgrade your subscription."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        serializer = CreateVideoJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        params = {
            "prompt": d.get("prompt", ""),
            "source": str(d["source"]) if d.get("source") else None,
            "end_frame": str(d["end_frame"]) if d.get("end_frame") else None,
            "quality": d.get("quality"),
            "seed": d.get("seed"),
            "model_type": d.get("model_type", "dop"),
            "motion_id": d.get("motion_id"),
            "motion_strength": d.get("motion_strength"),
            "resolution": d.get("resolution"),
            "aspect_ratio": d.get("aspect_ratio"),
            "duration": d.get("duration"),
            "model": d.get("model"),
            "negative_prompt": d.get("negative_prompt"),
            "enhance_prompt": d.get("enhance_prompt", False),
            "check_nsfw": d.get("check_nsfw", True),
        }
        job = GenerationJob.objects.create(
            user=request.user,
            kind=GenerationJob.Kind.VIDEO,
            provider="higgsfield",
            status=GenerationJob.Status.QUEUED,
            input_params=params,
        )

        from .tasks import run_video_generation
        run_video_generation.delay(str(job.id))

        return Response(
            GenerationJobSerializer(job, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


class UGCGenerationCreateView(generics.CreateAPIView):
    """Create a UGC talking-avatar video job (Higgsfield Speak)."""

    serializer_class = CreateUGCJobSerializer

    def create(self, request, *args, **kwargs):
        if not can_afford(request.user, "ugc"):
            return Response(
                {"error": "Insufficient credits to generate a UGC video. Please top up or upgrade your subscription."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        serializer = CreateUGCJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        params = {
            "image": str(d["image"]),
            "text": d["text"],
            "voice": str(d["voice"]) if d.get("voice") else None,
            "stock_voice_id": d.get("stock_voice_id") or None,
            "scenario": d.get("scenario", ""),
            "quality": d.get("quality", "high"),
            "duration": d.get("duration", 5),
            "seed": d.get("seed"),
            "enhance_prompt": d.get("enhance_prompt", True),
            "model_type": "speak",
            # Display text for history cards mirrors image/video jobs.
            "prompt": d["text"],
        }
        job = GenerationJob.objects.create(
            user=request.user,
            kind=GenerationJob.Kind.UGC,
            provider="higgsfield",
            status=GenerationJob.Status.QUEUED,
            input_params=params,
        )

        from .tasks import run_ugc_generation
        run_ugc_generation.delay(str(job.id))

        return Response(
            GenerationJobSerializer(job, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


class TTSGenerationCreateView(generics.CreateAPIView):
    """Create a text-to-speech job (VoiceSync AI). Speaks `text` in a cloned voice."""

    serializer_class = CreateTTSJobSerializer

    def create(self, request, *args, **kwargs):
        if not can_afford(request.user, "tts"):
            return Response(
                {"error": "Insufficient credits to generate text-to-speech. Please top up or upgrade your subscription."},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        serializer = CreateTTSJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        params = {
            "voice": str(d["voice"]) if d.get("voice") else None,
            "stock_voice_id": d.get("stock_voice_id") or None,
            "text": d["text"],
            # Mirror image/video: `prompt` powers the job's display text.
            "prompt": d["text"],
        }
        job = GenerationJob.objects.create(
            user=request.user,
            kind=GenerationJob.Kind.AUDIO,
            provider="elevenlabs",
            status=GenerationJob.Status.QUEUED,
            input_params=params,
        )

        from .tasks import run_tts_generation
        run_tts_generation.delay(str(job.id))

        return Response(
            GenerationJobSerializer(job, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


_STYLE_CACHE: list | None = None


class StylePresetListView(APIView):
    """List Higgsfield's built-in Soul style presets (id, name, description,
    preview_url). Cached in-process — the catalog rarely changes."""

    def get(self, request, *args, **kwargs):
        global _STYLE_CACHE
        if _STYLE_CACHE is None or request.query_params.get("refresh"):
            try:
                _STYLE_CACHE = higgsfield.list_soul_styles()
            except Exception as exc:
                return Response(
                    {"detail": f"Could not load styles: {exc}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
        return Response(_STYLE_CACHE)


class MotionPromptView(APIView):
    """Draft a short image-to-video motion prompt from a still-image prompt.

    Used by the image → video handoff so the user lands in the video studio with
    a motion-oriented prompt (not the static image description)."""

    def post(self, request, *args, **kwargs):
        image_prompt = (request.data.get("image_prompt") or "").strip()
        if not image_prompt:
            return Response(
                {"detail": "image_prompt is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from prompton.provider import suggest_motion_prompt

        try:
            prompt = suggest_motion_prompt(image_prompt)
        except Exception as exc:
            return Response(
                {"detail": f"Could not draft a motion prompt: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"prompt": prompt})


class GenerationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = GenerationJobSerializer

    def get_queryset(self):
        return GenerationJob.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        if job.status not in GenerationJob.TERMINAL:
            job.status = GenerationJob.Status.CANCELED
            job.save(update_fields=["status"])
        return Response(
            GenerationJobSerializer(job, context={"request": request}).data
        )

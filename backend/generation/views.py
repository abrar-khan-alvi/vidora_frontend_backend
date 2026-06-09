from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from providers import higgsfield

from .models import GenerationJob
from .serializers import (
    CreateAudioFxJobSerializer,
    CreateEditJobSerializer,
    CreateImageJobSerializer,
    CreateTTSJobSerializer,
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
            "segments": d.get("segments", 1),
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


class AudioFxCreateView(generics.CreateAPIView):
    """Generate background music or a sound effect (ElevenLabs) → audio Asset."""

    serializer_class = CreateAudioFxJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateAudioFxJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        kind_cost = "music" if d["audio_type"] == "music" else "sfx"
        if not can_afford(request.user, kind_cost):
            return Response(
                {"error": "Insufficient credits. Please top up or upgrade your subscription."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        params = {
            "audio_type": d["audio_type"],
            "prompt": d["prompt"],
            "length": d.get("length"),
        }
        job = GenerationJob.objects.create(
            user=request.user,
            kind=GenerationJob.Kind.AUDIO,
            provider="elevenlabs",
            status=GenerationJob.Status.QUEUED,
            input_params=params,
        )

        from .tasks import run_audio_fx_generation
        run_audio_fx_generation.delay(str(job.id))

        return Response(
            GenerationJobSerializer(job, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


class EditRenderCreateView(generics.CreateAPIView):
    """Render a single-clip edit: trim the source video + optional voiceover (FFmpeg)."""

    serializer_class = CreateEditJobSerializer

    def create(self, request, *args, **kwargs):
        if not can_afford(request.user, "edit"):
            return Response(
                {"error": "Insufficient credits to render an edit. Please top up or upgrade your subscription."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        serializer = CreateEditJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        clips = [
            {
                "source": str(c["source"]),
                "trim_start": c.get("trim_start", 0.0),
                "trim_end": c.get("trim_end"),
            }
            for c in d["clips"]
        ]
        audio_layers = [
            {
                "source": str(L["source"]),
                "offset": L.get("offset", 0.0),
                "volume": L.get("volume", 0.5),
            }
            for L in d.get("audio_layers", [])
        ]
        params = {
            "clips": clips,
            "voiceover": str(d["voiceover"]) if d.get("voiceover") else None,
            "voiceover_mode": d.get("voiceover_mode", "keep"),
            "voiceover_offset": d.get("voiceover_offset", 0.0),
            "audio_layers": audio_layers,
            # Mirror the other kinds: `prompt` powers the job's display text.
            "prompt": f"Video edit ({len(clips)} clip{'s' if len(clips) != 1 else ''})",
        }
        job = GenerationJob.objects.create(
            user=request.user,
            kind=GenerationJob.Kind.EDIT,
            provider="ffmpeg",
            status=GenerationJob.Status.QUEUED,
            input_params=params,
        )

        from .tasks import run_edit_render
        run_edit_render.delay(str(job.id))

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


class AudioSuggestView(APIView):
    """Let the AI decide a fitting music bed + sound effects for a video.

    Used by the editor's "Auto-score" flow: the creator never types an audio
    prompt — given a brief (content type, mood, the voiceover script) and the
    video duration, this returns a music prompt and 0-3 placed sound effects,
    which the editor then generates and lays under the video automatically.
    """

    def post(self, request, *args, **kwargs):
        brief = (request.data.get("brief") or "").strip()
        if not brief:
            return Response(
                {"detail": "brief is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        duration = request.data.get("duration")
        try:
            duration = float(duration) if duration is not None else None
        except (TypeError, ValueError):
            duration = None

        from prompton.provider import suggest_audio

        try:
            suggestion = suggest_audio(brief, duration)
        except Exception as exc:
            return Response(
                {"detail": f"Could not suggest audio: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(suggestion)


class GenerationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = GenerationJobSerializer

    def get_queryset(self):
        return GenerationJob.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        # Finished/failed/canceled jobs are safe to remove outright.
        if job.status in GenerationJob.TERMINAL:
            job.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        # Still running: cancel rather than delete — a worker mid-flight would
        # otherwise re-create the deleted row when it saves its result.
        job.status = GenerationJob.Status.CANCELED
        job.save(update_fields=["status"])
        return Response(
            GenerationJobSerializer(job, context={"request": request}).data
        )

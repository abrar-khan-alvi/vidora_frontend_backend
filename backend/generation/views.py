from rest_framework import generics, status
from rest_framework.response import Response

from .models import GenerationJob
from .serializers import (
    CreateImageJobSerializer,
    CreateVideoJobSerializer,
    GenerationJobSerializer,
)


class GenerationListCreateView(generics.ListCreateAPIView):
    serializer_class = GenerationJobSerializer

    def get_queryset(self):
        qs = GenerationJob.objects.filter(user=self.request.user)
        kind = self.request.query_params.get("kind")
        return qs.filter(kind=kind) if kind else qs

    def create(self, request, *args, **kwargs):
        serializer = CreateImageJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        params = {
            "prompt": d["prompt"],
            "aspect": d.get("aspect", "1:1"),
            "num_outputs": d.get("num_outputs", 1),
            "seed": d.get("seed"),
            "references": [str(x) for x in d.get("references", [])],
            "character_id": str(d["character_id"]) if d.get("character_id") else None,
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
        serializer = CreateVideoJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        params = {
            "prompt": d.get("prompt", ""),
            "source": str(d["source"]),
            "end_frame": str(d["end_frame"]) if d.get("end_frame") else None,
            "quality": d.get("quality", "standard"),
            "seed": d.get("seed"),
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

from django.conf import settings
from rest_framework import serializers

from studio.models import Asset
from studio.serializers import AssetSerializer

from .models import GenerationJob


class GenerationJobSerializer(serializers.ModelSerializer):
    prompt = serializers.SerializerMethodField()
    outputs = serializers.SerializerMethodField()

    class Meta:
        model = GenerationJob
        fields = (
            "id", "kind", "status", "prompt", "outputs",
            "error", "credits_cost", "created_at", "completed_at",
        )
        read_only_fields = fields

    def get_prompt(self, obj):
        return obj.input_params.get("prompt", "")

    def get_outputs(self, obj):
        ids = obj.output_asset_ids or []
        if not ids:
            return []
        by_id = {str(a.id): a for a in Asset.objects.filter(id__in=ids)}
        ordered = [by_id[i] for i in ids if i in by_id]
        return AssetSerializer(ordered, many=True, context=self.context).data


class CreateImageJobSerializer(serializers.Serializer):
    prompt = serializers.CharField()
    aspect = serializers.CharField(required=False, default="1:1")
    num_outputs = serializers.IntegerField(required=False, default=1, min_value=1, max_value=4)
    seed = serializers.IntegerField(required=False, allow_null=True)
    references = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        max_length=settings.HIGGSFIELD_MAX_REFERENCES,
    )
    character_id = serializers.UUIDField(required=False, allow_null=True)


class CreateVideoJobSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=False, allow_blank=True, default="")
    source = serializers.UUIDField()  # required start frame
    end_frame = serializers.UUIDField(required=False, allow_null=True)
    quality = serializers.ChoiceField(
        choices=["lite", "standard", "turbo"], required=False, default="standard"
    )
    seed = serializers.IntegerField(required=False, allow_null=True)

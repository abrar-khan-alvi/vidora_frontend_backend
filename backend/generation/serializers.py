from rest_framework import serializers

from studio.models import Asset
from studio.serializers import AssetSerializer

from .models import GenerationJob


class GenerationJobSerializer(serializers.ModelSerializer):
    prompt = serializers.SerializerMethodField()
    outputs = serializers.SerializerMethodField()
    # The job's settings + its input frames — so a past job can be re-run.
    input_params = serializers.JSONField(read_only=True)
    source_frame = serializers.SerializerMethodField()
    end_frame = serializers.SerializerMethodField()

    class Meta:
        model = GenerationJob
        fields = (
            "id", "kind", "status", "prompt", "outputs",
            "error", "credits_cost", "created_at", "completed_at",
            "input_params", "source_frame", "end_frame",
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

    def _frame(self, obj, key):
        aid = obj.input_params.get(key)
        if not aid:
            return None
        asset = Asset.objects.filter(id=aid).first()
        return AssetSerializer(asset, context=self.context).data if asset else None

    def get_source_frame(self, obj):
        return self._frame(obj, "source")

    def get_end_frame(self, obj):
        return self._frame(obj, "end_frame")


class CreateImageJobSerializer(serializers.Serializer):
    prompt = serializers.CharField()
    aspect = serializers.CharField(required=False, default="1:1")
    num_outputs = serializers.IntegerField(required=False, default=1, min_value=1, max_value=4)
    seed = serializers.IntegerField(required=False, allow_null=True)
    # A trained reference (Character) — the subject (Soul `custom_reference_id`).
    reference = serializers.UUIDField(required=False, allow_null=True)
    reference_strength = serializers.FloatField(
        required=False, default=1.0, min_value=0.0, max_value=1.0
    )
    # A built-in Soul style preset — the look (Soul `style_id`).
    style = serializers.UUIDField(required=False, allow_null=True)
    style_strength = serializers.FloatField(
        required=False, default=1.0, min_value=0.0, max_value=1.0
    )


class CreateVideoJobSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=False, allow_blank=True, default="")
    source = serializers.UUIDField(required=False, allow_null=True)  # optional start frame
    end_frame = serializers.UUIDField(required=False, allow_null=True)
    quality = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    seed = serializers.IntegerField(required=False, allow_null=True)
    model_type = serializers.ChoiceField(
        choices=["dop", "seedance", "kling"], required=False, default="dop"
    )
    # DoP segments to chain into one clip (1 ≈ 5s, 2 ≈ 10s, … up to 4 ≈ 20s).
    segments = serializers.IntegerField(required=False, default=1, min_value=1, max_value=4)
    motion_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    motion_strength = serializers.FloatField(required=False, allow_null=True)
    resolution = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    aspect_ratio = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    duration = serializers.IntegerField(required=False, allow_null=True)
    model = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    negative_prompt = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    enhance_prompt = serializers.BooleanField(required=False, default=False)
    check_nsfw = serializers.BooleanField(required=False, default=True)


class _EditClipSerializer(serializers.Serializer):
    """One clip in the edit sequence: a video Asset + its in/out points."""

    source = serializers.UUIDField()
    trim_start = serializers.FloatField(required=False, default=0.0, min_value=0.0)
    trim_end = serializers.FloatField(required=False, allow_null=True)  # null → to the end


class _AudioLayerSerializer(serializers.Serializer):
    """A music/SFX audio Asset mixed under the video at an offset + volume."""

    source = serializers.UUIDField()
    offset = serializers.FloatField(required=False, default=0.0, min_value=0.0)
    volume = serializers.FloatField(required=False, default=0.5, min_value=0.0, max_value=2.0)


class CreateEditJobSerializer(serializers.Serializer):
    """Join + trim a sequence of clips and optionally lay a voiceover over it."""

    clips = _EditClipSerializer(many=True)
    voiceover = serializers.UUIDField(required=False, allow_null=True)  # an audio Asset
    voiceover_mode = serializers.ChoiceField(
        choices=["keep", "replace", "mix"], required=False, default="keep"
    )
    voiceover_offset = serializers.FloatField(required=False, default=0.0, min_value=0.0)
    audio_layers = _AudioLayerSerializer(many=True, required=False, default=list)

    def validate_clips(self, value):
        if not value:
            raise serializers.ValidationError("At least one clip is required.")
        for c in value:
            start = c.get("trim_start") or 0.0
            end = c.get("trim_end")
            if end is not None and end <= start:
                raise serializers.ValidationError("Each clip's trim_end must be greater than trim_start.")
        return value

    def validate(self, data):
        if data.get("voiceover_mode") in ("replace", "mix") and not data.get("voiceover"):
            raise serializers.ValidationError("A voiceover is required for replace/mix mode.")
        return data


class CreateAudioFxJobSerializer(serializers.Serializer):
    """Generate background music or a sound effect from a text prompt."""

    audio_type = serializers.ChoiceField(choices=["music", "sfx"])
    prompt = serializers.CharField(max_length=2000)
    # Music length in seconds (clamped); SFX uses `duration` seconds.
    length = serializers.FloatField(required=False, allow_null=True)


class CreateTTSJobSerializer(serializers.Serializer):
    """Generate speech (TTS) in either a cloned voice or a built-in stock voice."""

    voice = serializers.UUIDField(required=False, allow_null=True)  # a ready cloned Voice
    stock_voice_id = serializers.CharField(required=False, allow_blank=True)  # ElevenLabs premade voice id
    text = serializers.CharField(max_length=5000)

    def validate(self, data):
        if not data.get("voice") and not data.get("stock_voice_id"):
            raise serializers.ValidationError("Select a voice (cloned or stock).")
        return data

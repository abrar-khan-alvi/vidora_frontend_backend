from rest_framework import serializers
from billing.models import Plan, Subscription
from generation.credits import balance as get_credits_balance

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["slug", "name", "price", "monthly_credits", "features"]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    credits_remaining = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "id",
            "plan",
            "status",
            "current_period_end",
            "credits_remaining",
            "is_active",
        ]

    def get_credits_remaining(self, obj):
        return get_credits_balance(obj.user)

    def get_is_active(self, obj):
        # Active if status is active or trialing
        return obj.status in ["active", "trialing"]

from django.contrib import admin
from billing.models import Plan, Subscription, CreditTopUp

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "price", "monthly_credits")
    search_fields = ("slug", "name")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "status", "current_period_end")
    list_filter = ("status", "plan")
    search_fields = ("user__email", "stripe_subscription_id")


@admin.register(CreditTopUp)
class CreditTopUpAdmin(admin.ModelAdmin):
    list_display = ("user", "pack_slug", "amount", "purchased_at")
    list_filter = ("pack_slug",)
    search_fields = ("user__email", "stripe_payment_intent_id")


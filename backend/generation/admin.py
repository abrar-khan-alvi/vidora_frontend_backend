from django.contrib import admin

from .models import CreditLedger, GenerationJob


@admin.register(GenerationJob)
class GenerationJobAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "kind", "status", "provider", "credits_cost", "created_at")
    list_filter = ("kind", "status", "provider")
    search_fields = ("user__email", "provider_job_id")
    readonly_fields = ("created_at", "submitted_at", "completed_at")


@admin.register(CreditLedger)
class CreditLedgerAdmin(admin.ModelAdmin):
    list_display = ("user", "delta", "reason", "ref_job", "created_at")
    search_fields = ("user__email",)

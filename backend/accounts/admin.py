from django.contrib import admin

from .models import OneTimeCode, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "display_name", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff")
    search_fields = ("email", "display_name")
    ordering = ("-date_joined",)
    readonly_fields = ("id", "date_joined", "last_login")


@admin.register(OneTimeCode)
class OneTimeCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "code", "created_at", "expires_at", "consumed_at")
    list_filter = ("purpose",)
    search_fields = ("user__email",)

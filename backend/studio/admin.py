from django.contrib import admin

from .models import Asset, Character, Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "kind", "created_at")
    search_fields = ("title", "user__email")


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "type", "source", "width", "height", "created_at")
    list_filter = ("type", "source")
    search_fields = ("user__email",)


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "status", "provider_character_id", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "user__email")

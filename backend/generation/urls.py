from django.urls import path

from . import views

urlpatterns = [
    path("", views.GenerationListCreateView.as_view(), name="generation-list-create"),
    path("video/", views.VideoGenerationCreateView.as_view(), name="generation-video-create"),
    path("tts/", views.TTSGenerationCreateView.as_view(), name="generation-tts-create"),
    path("styles/", views.StylePresetListView.as_view(), name="generation-styles"),
    path("<uuid:pk>/", views.GenerationDetailView.as_view(), name="generation-detail"),
]

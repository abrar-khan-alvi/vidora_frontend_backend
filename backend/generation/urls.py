from django.urls import path

from . import views

urlpatterns = [
    path("", views.GenerationListCreateView.as_view(), name="generation-list-create"),
    path("video/", views.VideoGenerationCreateView.as_view(), name="generation-video-create"),
    path("tts/", views.TTSGenerationCreateView.as_view(), name="generation-tts-create"),
    path("edit/", views.EditRenderCreateView.as_view(), name="generation-edit-create"),
    path("audio/", views.AudioFxCreateView.as_view(), name="generation-audio-create"),
    path("audio/suggest/", views.AudioSuggestView.as_view(), name="generation-audio-suggest"),
    path("styles/", views.StylePresetListView.as_view(), name="generation-styles"),
    path("motion-prompt/", views.MotionPromptView.as_view(), name="generation-motion-prompt"),
    path("<uuid:pk>/", views.GenerationDetailView.as_view(), name="generation-detail"),
]

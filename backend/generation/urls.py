from django.urls import path

from . import views

urlpatterns = [
    path("", views.GenerationListCreateView.as_view(), name="generation-list-create"),
    path("video/", views.VideoGenerationCreateView.as_view(), name="generation-video-create"),
    path("<uuid:pk>/", views.GenerationDetailView.as_view(), name="generation-detail"),
]

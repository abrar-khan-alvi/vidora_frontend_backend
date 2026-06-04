from django.urls import path

from . import views

urlpatterns = [
    path("assets/", views.AssetUploadView.as_view(), name="asset-upload"),
    path("references/", views.ReferenceListView.as_view(), name="reference-list"),
    path("assets/<uuid:pk>/", views.AssetDetailView.as_view(), name="asset-detail"),
    path("characters/", views.CharacterListView.as_view(), name="character-list"),
]

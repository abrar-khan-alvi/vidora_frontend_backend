from django.urls import path

from . import views

urlpatterns = [
    path("assets/", views.AssetUploadView.as_view(), name="asset-upload"),
    path("media/", views.MediaAssetListCreateView.as_view(), name="media-list-create"),
    path("references/", views.ReferenceListView.as_view(), name="reference-list"),
    path("assets/<uuid:pk>/", views.AssetDetailView.as_view(), name="asset-detail"),
    path("characters/", views.CharacterListCreateView.as_view(), name="character-list"),
    path("characters/<uuid:pk>/", views.CharacterDetailView.as_view(), name="character-detail"),
    path("voices/", views.VoiceListCreateView.as_view(), name="voice-list"),
    path("voices/stock/", views.StockVoiceListView.as_view(), name="voice-stock"),
    path("voices/<uuid:pk>/", views.VoiceDetailView.as_view(), name="voice-detail"),
    path("publications/", views.PublicationListCreateView.as_view(), name="publication-list"),
    path("publications/<uuid:pk>/", views.PublicationDetailView.as_view(), name="publication-detail"),
    path("share/<uuid:token>/", views.PublicShareView.as_view(), name="publication-share"),
]

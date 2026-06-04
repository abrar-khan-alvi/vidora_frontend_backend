from django.urls import path

from . import views

urlpatterns = [
    path("conversations/", views.ConversationListCreateView.as_view(), name="conversation-list"),
    path("conversations/<uuid:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<uuid:pk>/stream/", views.StreamMessageView.as_view(), name="conversation-stream"),
]

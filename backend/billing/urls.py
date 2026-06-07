from django.urls import path
from billing.views import (
    CurrentSubscriptionView,
    CreateCheckoutSessionView,
    CustomerPortalView,
    StripeWebhookView,
)

urlpatterns = [
    path("me/", CurrentSubscriptionView.as_view(), name="billing-me"),
    path("checkout/", CreateCheckoutSessionView.as_view(), name="billing-checkout"),
    path("portal/", CustomerPortalView.as_view(), name="billing-portal"),
    path("webhook/", StripeWebhookView.as_view(), name="billing-webhook"),
]

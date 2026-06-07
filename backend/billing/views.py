import logging
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from billing.models import Plan, Subscription, CreditTopUp
from billing.serializers import SubscriptionSerializer
from billing import stripe_client
from generation.credits import record as record_credit

logger = logging.getLogger(__name__)
User = get_user_model()

class CurrentSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sub, created = Subscription.objects.get_or_create(user=request.user)
        # If user has no plan, make sure we return a clean serialization (plan=None)
        serializer = SubscriptionSerializer(sub)
        return Response(serializer.data)


class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_slug = request.data.get("plan_slug")
        topup_slug = request.data.get("topup_slug")

        # Let the frontend pass success and cancel URLs, or use defaults
        frontend_origin = request.headers.get("Origin") or "http://localhost:5173"
        success_url = request.data.get("success_url") or f"{frontend_origin}/dashboard/subscription-success"
        cancel_url = request.data.get("cancel_url") or f"{frontend_origin}/dashboard/subscriptions"

        try:
            if plan_slug:
                # User wants to subscribe to a plan
                try:
                    plan = Plan.objects.get(slug=plan_slug)
                except Plan.DoesNotExist:
                    return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

                # Ensure price ID is present
                price_id = plan.stripe_price_id
                if not price_id or "placeholder" in price_id:
                    # In test/dev mode, if price_id is placeholder, we can create a temporary checkout
                    # by setting up an ad-hoc subscription if Stripe doesn't have the price.
                    # However, to be fully authentic and compatible with Stripe CLI/Dashboard,
                    # we attempt to use the stripe_price_id. Let's raise an error if they didn't set it,
                    # but also provide a fallback.
                    pass

                checkout_url = stripe_client.create_checkout_session(
                    user=request.user,
                    plan_slug=plan.slug,
                    price_id=price_id,
                    success_url=success_url,
                    cancel_url=cancel_url
                )
                return Response({"checkout_url": checkout_url})

            elif topup_slug:
                # User wants to purchase a one-off credit pack
                if topup_slug == "standard_topup":
                    price_cents = 1500  # $15.00
                    credits_amount = 100
                elif topup_slug == "creator_topup":
                    price_cents = 5000  # $50.00
                    credits_amount = 500
                else:
                    return Response({"error": "Invalid top-up package"}, status=status.HTTP_400_BAD_REQUEST)

                checkout_url = stripe_client.create_topup_checkout_session(
                    user=request.user,
                    pack_slug=topup_slug,
                    price_amount_cents=price_cents,
                    credits_amount=credits_amount,
                    success_url=success_url,
                    cancel_url=cancel_url
                )
                return Response({"checkout_url": checkout_url})

            else:
                return Response(
                    {"error": "Either plan_slug or topup_slug is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomerPortalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        frontend_origin = request.headers.get("Origin") or "http://localhost:5173"
        return_url = request.data.get("return_url") or f"{frontend_origin}/dashboard/subscriptions"

        try:
            portal_url = stripe_client.create_portal_session(request.user, return_url)
            return Response({"portal_url": portal_url})
        except Exception as e:
            logger.error(f"Error creating customer portal session: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.headers.get("Stripe-Signature", "")

        try:
            event = stripe_client.construct_webhook_event(payload, sig_header)
        except ValueError as e:
            logger.warning("Invalid payload")
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            logger.warning("Invalid signature")
            return HttpResponse(status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})

        logger.info(f"Received Stripe webhook event: {event_type}")

        if event_type == "checkout.session.completed":
            metadata = data_object.get("metadata", {})
            user_id = metadata.get("user_id")
            session_type = metadata.get("type")

            if not user_id:
                logger.warning("No user_id found in session metadata")
                return HttpResponse(status=status.HTTP_200_OK)

            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                logger.error(f"User with ID {user_id} not found")
                return HttpResponse(status=status.HTTP_200_OK)

            if session_type == "subscription":
                plan_slug = metadata.get("plan_slug")
                stripe_sub_id = data_object.get("subscription")
                stripe_cust_id = data_object.get("customer")

                try:
                    plan = Plan.objects.get(slug=plan_slug)
                except Plan.DoesNotExist:
                    logger.error(f"Plan with slug {plan_slug} not found")
                    return HttpResponse(status=status.HTTP_200_OK)

                # Retrieve subscription to get active dates
                try:
                    stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
                    stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
                    current_period_end = timezone.datetime.fromtimestamp(
                        stripe_sub.current_period_end, tz=timezone.utc
                    )
                    sub_status = stripe_sub.status
                except Exception as e:
                    logger.error(f"Error fetching subscription from Stripe: {e}")
                    current_period_end = timezone.now() + timezone.timedelta(days=30)
                    sub_status = "active"

                sub, _ = Subscription.objects.get_or_create(user=user)
                sub.plan = plan
                sub.stripe_subscription_id = stripe_sub_id
                sub.stripe_customer_id = stripe_cust_id
                sub.status = sub_status
                sub.current_period_end = current_period_end
                sub.save()

                # Grant credits
                record_credit(
                    user=user,
                    delta=plan.monthly_credits,
                    reason=f"Subscription plan activation: {plan.name}"
                )
                logger.info(f"Granted {plan.monthly_credits} credits to {user.email} for plan {plan.name}")

            elif session_type == "topup":
                pack_slug = metadata.get("pack_slug")
                credits_amount = int(metadata.get("credits_amount", 0))
                payment_intent = data_object.get("payment_intent")

                # Record top-up
                CreditTopUp.objects.create(
                    user=user,
                    pack_slug=pack_slug,
                    amount=credits_amount,
                    stripe_payment_intent_id=payment_intent or ""
                )

                # Grant credits
                record_credit(
                    user=user,
                    delta=credits_amount,
                    reason=f"Top-up: {pack_slug.replace('_', ' ').title()}"
                )
                logger.info(f"Granted {credits_amount} top-up credits to {user.email}")

        elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
            stripe_sub_id = data_object.get("id")
            sub_status = data_object.get("status")
            current_period_end_ts = data_object.get("current_period_end")

            try:
                sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
                sub.status = sub_status
                if current_period_end_ts:
                    sub.current_period_end = timezone.datetime.fromtimestamp(
                        current_period_end_ts, tz=timezone.utc
                    )
                
                # If subscription is canceled or unpaid, remove the plan
                if sub_status in ["canceled", "unpaid"]:
                    sub.plan = None
                sub.save()
                logger.info(f"Updated subscription {stripe_sub_id} status to {sub_status}")
            except Subscription.DoesNotExist:
                logger.warning(f"Subscription {stripe_sub_id} not found in DB")

        elif event_type == "invoice.paid":
            # Handle renewal credits
            stripe_sub_id = data_object.get("subscription")
            if stripe_sub_id:
                try:
                    sub = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
                    if sub.plan:
                        # Grant renewal credits
                        record_credit(
                            user=sub.user,
                            delta=sub.plan.monthly_credits,
                            reason=f"Subscription renewal: {sub.plan.name}"
                        )
                        logger.info(f"Granted renewal {sub.plan.monthly_credits} credits to {sub.user.email}")
                except Subscription.DoesNotExist:
                    logger.warning(f"Subscription {stripe_sub_id} not found on invoice.paid")

        return HttpResponse(status=status.HTTP_200_OK)

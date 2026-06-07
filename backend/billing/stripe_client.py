import stripe
from django.conf import settings

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

def get_or_create_customer(user):
    from billing.models import Subscription
    sub, created = Subscription.objects.get_or_create(user=user)
    if sub.stripe_customer_id:
        return sub.stripe_customer_id
    
    # Create Stripe Customer
    customer = stripe.Customer.create(
        email=user.email,
        name=user.display_name or user.email,
        metadata={"user_id": str(user.id)}
    )
    sub.stripe_customer_id = customer.id
    sub.save(update_fields=["stripe_customer_id"])
    return customer.id


def create_checkout_session(user, plan_slug, price_id, success_url, cancel_url):
    customer_id = get_or_create_customer(user)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[
            {
                "price": price_id,
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": str(user.id),
            "plan_slug": plan_slug,
            "type": "subscription"
        }
    )
    return session.url


def create_topup_checkout_session(user, pack_slug, price_amount_cents, credits_amount, success_url, cancel_url):
    customer_id = get_or_create_customer(user)
    # Using line_items with price_data creates an ad-hoc price on the fly.
    # This prevents the user from needing to manually create products/prices in the Stripe dashboard for one-off top-ups.
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Vidora {credits_amount} Credits Top-up",
                        "description": f"Purchase {credits_amount} on-demand credits.",
                    },
                    "unit_amount": price_amount_cents,
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": str(user.id),
            "pack_slug": pack_slug,
            "credits_amount": str(credits_amount),
            "type": "topup"
        }
    )
    return session.url


def create_portal_session(user, return_url):
    from billing.models import Subscription
    sub = Subscription.objects.filter(user=user).first()
    if not sub or not sub.stripe_customer_id:
        raise ValueError("No Stripe customer exists for this user.")
    
    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=return_url
    )
    return session.url


def construct_webhook_event(payload, sig_header):
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    return stripe.Webhook.construct_event(
        payload, sig_header, webhook_secret
    )

from django.core.management.base import BaseCommand
from billing.models import Plan

class Command(BaseCommand):
    help = "Seeds database with default subscription plans"

    def handle(self, *args, **options):
        # We define plans with dummy/test Stripe price IDs.
        # User will replace them or we can let Stripe CLI / Dashboard generate them.
        plans_data = [
            {
                "slug": "starter",
                "name": "Starter",
                "price": 29.00,
                "monthly_credits": 50,  # 10 videos * 5 credits/video
                "stripe_price_id": "price_1P_starter_placeholder",
                "features": [
                    "10 High-Res Video Generations",
                    "No Watermarks",
                    "Commercial Usage Rights",
                    "HD Quality Export",
                    "Standard Rendering Speed"
                ]
            },
            {
                "slug": "creator",
                "name": "Creator",
                "price": 97.00,
                "monthly_credits": 250,  # 50 videos * 5 credits/video
                "stripe_price_id": "price_1P_creator_placeholder",
                "features": [
                    "50 Premium Video Generations",
                    "4K Ultra HD Exports",
                    "Full Commercial Rights",
                    "Advanced Motion Control",
                    "Priority Rendering Path",
                    "Beta Access to New Models"
                ]
            },
            {
                "slug": "pro",
                "name": "Pro",
                "price": 199.00,
                "monthly_credits": 1000,  # 200 videos * 5 credits/video
                "stripe_price_id": "price_1P_pro_placeholder",
                "features": [
                    "Unlimited Standard Generations",
                    "200 4K Master Generations",
                    "Custom Character References",
                    "Dedicated Server Support",
                    "Early API Access",
                    "Team Collaboration Seats"
                ]
            }
        ]

        for p_data in plans_data:
            plan, created = Plan.objects.update_or_create(
                slug=p_data["slug"],
                defaults={
                    "name": p_data["name"],
                    "price": p_data["price"],
                    "monthly_credits": p_data["monthly_credits"],
                    "stripe_price_id": p_data["stripe_price_id"],
                    "features": p_data["features"]
                }
            )
            status = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{status} plan: {plan.name}"))

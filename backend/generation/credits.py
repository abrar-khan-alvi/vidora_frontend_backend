from django.db.models import Sum

from .models import CreditLedger

# Per-kind credit cost (placeholder until the billing phase sets real economics).
COST = {"image": 1, "video": 5}


def balance(user) -> int:
    return CreditLedger.objects.filter(user=user).aggregate(s=Sum("delta"))["s"] or 0


def record(user, delta: int, reason: str, ref_job=None):
    CreditLedger.objects.create(user=user, delta=delta, reason=reason, ref_job=ref_job)

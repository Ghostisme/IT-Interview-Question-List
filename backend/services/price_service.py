"""
services/price_service.py — Price calculation engine.

All monetary arithmetic uses Python's Decimal type to avoid
floating-point rounding errors (e.g. 33.33 × 3 = 99.99 exactly).

Key business rules:
  - RRP is the Recommended Retail Price in USD, already GST-inclusive.
  - line_total = unit_price × quantity
  - subtotal   = sum of all line_totals (still GST-inclusive)
  - gst        = subtotal × 10 / 110   (back-calculate GST component from inclusive price)
  - total      = subtotal               (shipping fee is added separately)
"""

from decimal import Decimal, ROUND_HALF_UP

from logger import get_logger

log = get_logger("price_service")

GST_RATE = Decimal("0.10")  # Australian GST = 10%


def calculate_line_total(unit_price: float, quantity: int) -> float:
    """
    Compute a single line item's total.
    Uses Decimal to guarantee cent-level precision.
    Example: calculate_line_total(175.00, 3) → 525.00
    """
    total = Decimal(str(unit_price)) * Decimal(str(quantity))
    return float(total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_order_totals(
    items: list[dict],
) -> dict:
    """
    Aggregate all line items into order-level financial totals.

    Args:
        items: list of {"unit_price": float, "quantity": int}

    Returns:
        {"subtotal": float, "gst": float, "total": float}

    Example:
        items = [{"unit_price": 175.0, "quantity": 3},
                 {"unit_price": 89.0,  "quantity": 6}]
        → subtotal = 1059.0,  gst = 96.27,  total = 1059.0
    """
    subtotal = Decimal("0")
    for item in items:
        line = Decimal(str(item["unit_price"])) * Decimal(str(item["quantity"]))
        subtotal += line

    subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    # GST back-calculation: price_incl_gst × rate / (1 + rate)
    gst = (subtotal * GST_RATE / (1 + GST_RATE)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    log.debug("subtotal=%s gst=%s", subtotal, gst)
    return {
        "subtotal": float(subtotal),
        "gst": float(gst),
        "total": float(subtotal),
    }

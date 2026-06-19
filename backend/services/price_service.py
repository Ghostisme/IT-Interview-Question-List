"""
services/price_service.py — Price calculation engine.

All monetary arithmetic uses Python's Decimal type to avoid
floating-point rounding errors (e.g. 33.33 × 3 = 99.99 exactly).

Key business rules (per assessment specification):
  - RRP is the Recommended Retail Price in USD, already GST-inclusive.
  - line_total = unit_price × quantity
  - subtotal   = sum of all line_totals
  - gst        = subtotal × 10%  (as specified by assessment: "GST = 10% of Subtotal")
  - total      = subtotal + gst + shipping_fee
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
    shipping_fee: float = 0.0,
) -> dict:
    """
    Aggregate all line items into order-level financial totals.

    Per assessment specification:
      GST   = Subtotal × 10%
      Total = Subtotal + GST + Shipment Fee

    Args:
        items: list of {"unit_price": float, "quantity": int}
        shipping_fee: shipping cost (default 0.0)

    Returns:
        {"subtotal": float, "gst": float, "shipping_fee": float, "total": float}
    """
    subtotal = Decimal("0")
    for item in items:
        line = Decimal(str(item["unit_price"])) * Decimal(str(item["quantity"]))
        subtotal += line

    subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    gst = (subtotal * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    ship = Decimal(str(shipping_fee)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (subtotal + gst + ship).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    log.debug("subtotal=%s gst=%s shipping=%s total=%s", subtotal, gst, ship, total)
    return {
        "subtotal": float(subtotal),
        "gst": float(gst),
        "shipping_fee": float(ship),
        "total": float(total),
    }

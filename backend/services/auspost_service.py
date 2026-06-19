"""
services/auspost_service.py — AusPost / StarTrack API integration.

Two main functions:
  1. get_shipping_quotes() — domestic parcel pricing
     Endpoint: POST /test/shipping/v1/prices/items
     Request body: { "from": {"postcode": "..."}, "to": {"postcode": "..."}, "items": [...] }
     Auth: Basic Auth (API_KEY:PASSWORD) + Account-Number header

  2. track_shipment() — parcel tracking status
     Endpoint: GET /test/shipping/v1/track
     Returns delivery events, current status, and raw API response

Authentication uses HTTP Basic Auth with the API key and password
from .env, encoded as Base64. The Account-Number header is also required.
"""

import base64

import httpx

from config import get_settings
from logger import get_logger

log = get_logger("auspost_service")

AUSPOST_BASE = "https://digitalapi.auspost.com.au/test/shipping/v1"


def _auth_header() -> dict[str, str]:
    """Build HTTP headers with Basic Auth and account number for AusPost API."""
    s = get_settings()
    token = base64.b64encode(
        f"{s.AUSPOST_API_KEY}:{s.AUSPOST_PASSWORD}".encode()
    ).decode()
    return {
        "Authorization": f"Basic {token}",
        "Account-Number": s.AUSPOST_ACCOUNT_NUMBER,
        "Content-Type": "application/json",
    }


async def get_shipping_quotes(
    from_postcode: str,
    to_postcode: str,
    weight: float,
    length: float = 20.0,
    width: float = 15.0,
    height: float = 10.0,
) -> list[dict]:
    """
    Fetch domestic parcel shipping quotes from AusPost pricing API.

    Uses POST /prices/items with JSON body (not GET with query params).

    Args:
        from_postcode: Sender's Australian postcode (e.g. "2000" for Sydney)
        to_postcode:   Recipient's postcode (e.g. "3000" for Melbourne)
        weight:        Parcel weight in kg
        length/width/height: Dimensions in cm (defaults suit small parcels)

    Returns:
        List of available services, each with:
        - service_name: e.g. "Parcel Post", "Express Post"
        - service_code: AusPost internal code
        - price:        Calculated shipping cost in AUD
        - estimated_days: Delivery time estimate string
    """
    body = {
        "from": {"postcode": from_postcode},
        "to": {"postcode": to_postcode},
        "items": [
            {
                "weight": weight,
                "length": length,
                "width": width,
                "height": height,
            }
        ],
    }
    log.info("Requesting shipping quote: %s -> %s, %.2fkg", from_postcode, to_postcode, weight)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{AUSPOST_BASE}/prices/items",
                json=body,
                headers=_auth_header(),
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        items = data.get("items", [])
        if items:
            prices = items[0].get("prices", [])
            for p in prices:
                results.append(
                    {
                        "service_name": p.get("product_type", ""),
                        "service_code": p.get("product_id", ""),
                        "price": float(p.get("calculated_price", 0)),
                        "estimated_days": p.get("delivery_time", ""),
                    }
                )
        log.info("Got %d shipping quotes", len(results))
        return results
    except httpx.HTTPStatusError as exc:
        log.error("AusPost API error: %s %s", exc.response.status_code, exc.response.text)
        raise
    except Exception as exc:
        log.error("AusPost request failed: %s", exc)
        raise


async def track_shipment(tracking_number: str) -> dict:
    """
    Query AusPost tracking API for a shipment's current status.

    Returns a dict with carrier, tracking_number, status, events list,
    and the raw API response. On failure, returns status="error" with
    the error message (never raises — the caller always gets a result).
    """
    log.info("Tracking shipment: %s", tracking_number)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{AUSPOST_BASE}/track",
                params={"tracking_ids": tracking_number},
                headers=_auth_header(),
            )
            resp.raise_for_status()
            data = resp.json()

        articles = data.get("tracking_results", [])
        if articles:
            article = articles[0]
            events = article.get("trackable_items", [{}])[0].get("events", [])
            return {
                "carrier": "AusPost/StarTrack",
                "tracking_number": tracking_number,
                "status": article.get("status", "unknown"),
                "events": events,
                "raw": article,
            }
        return {
            "carrier": "AusPost/StarTrack",
            "tracking_number": tracking_number,
            "status": "not_found",
            "events": [],
            "raw": data,
        }
    except Exception as exc:
        log.error("Tracking request failed: %s", exc)
        return {
            "carrier": "AusPost/StarTrack",
            "tracking_number": tracking_number,
            "status": "error",
            "events": [],
            "raw": {"error": str(exc)},
        }

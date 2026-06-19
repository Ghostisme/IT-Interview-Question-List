"""TNT tracking service -- degraded mode.

Direct TNT API integration has authentication / schema issues.
We provide a tracking-link fallback and placeholder for future fixes.
"""

from logger import get_logger

log = get_logger("tnt_service")

TNT_TRACK_URL = "https://www.tnt.com/express/en_au/site/tracking.html"


async def track_shipment(tracking_number: str) -> dict:
    """Return a tracking link for TNT consignments (degraded mode)."""
    log.info("TNT tracking (degraded): %s", tracking_number)
    return {
        "carrier": "TNT",
        "tracking_number": tracking_number,
        "status": "see_link",
        "events": [],
        "raw": {
            "note": "TNT API integration in degraded mode. Use web link.",
            "tracking_url": f"{TNT_TRACK_URL}?searchType=con&cons={tracking_number}",
        },
    }

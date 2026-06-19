"""
routers/tracking.py — Shipment tracking and shipping cost API endpoints.

Endpoints:
  GET  /api/tracking/query           Live-query carrier API for tracking status
                                       - carrier=auspost → AusPost/StarTrack API
                                       - carrier=tnt     → TNT degraded mode (web link)
  POST /api/tracking/shipping-quote  Get AusPost domestic parcel shipping quotes
                                       based on postcodes, weight, and dimensions
  POST /api/tracking/{order_id}      Attach a tracking record to an order
  GET  /api/tracking/{order_id}      List all tracking records for an order
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import Tracking, Order
from models.schemas import TrackingCreate, TrackingOut, TrackingQueryOut, ShippingQuoteRequest, ShippingQuoteOut
from services import auspost_service, tnt_service
from logger import get_logger

log = get_logger("router.tracking")
router = APIRouter(prefix="/api/tracking", tags=["tracking"])


@router.get("/query")
async def query_tracking(
    tracking_number: str = Query(...),
    carrier: str = Query("auspost", description="auspost or tnt"),
):
    """
    Live-query a carrier's tracking API for current shipment status.
    AusPost/StarTrack: calls the real API and returns events.
    TNT: returns a tracking web link (API in degraded mode due to auth issues).
    """
    log.info("Query tracking: carrier=%s number=%s", carrier, tracking_number)
    if carrier.lower() in ("tnt",):
        result = await tnt_service.track_shipment(tracking_number)
    else:
        result = await auspost_service.track_shipment(tracking_number)
    return TrackingQueryOut(**result)


@router.post("/shipping-quote", response_model=list[ShippingQuoteOut])
async def shipping_quote(body: ShippingQuoteRequest):
    """
    Get domestic shipping cost estimates from AusPost.
    Returns a list of available services with prices and delivery timeframes.
    Example: Sydney(2000) → Melbourne(3000), 1kg → returns Express, Standard, etc.
    """
    log.info("Shipping quote request: %s", body.model_dump())
    quotes = await auspost_service.get_shipping_quotes(
        from_postcode=body.from_postcode,
        to_postcode=body.to_postcode,
        weight=body.weight,
        length=body.length,
        width=body.width,
        height=body.height,
    )
    return [ShippingQuoteOut(**q) for q in quotes]


@router.post("/{order_id}", response_model=TrackingOut, status_code=201)
def add_tracking(order_id: int, body: TrackingCreate, db: Session = Depends(get_db)):
    """Attach a new tracking record (carrier + tracking number) to an order."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    record = Tracking(order_id=order_id, **body.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    log.info("Added tracking %s for order %d", record.tracking_number, order_id)
    return record


@router.get("/{order_id}", response_model=list[TrackingOut])
def list_tracking(order_id: int, db: Session = Depends(get_db)):
    """List all tracking records associated with an order."""
    records = db.query(Tracking).filter(Tracking.order_id == order_id).all()
    return records

"""
routers/orders.py — Order CRUD API endpoints.

Endpoints:
  GET    /api/orders              List order summaries (paginated, filterable by status)
  GET    /api/orders/{id}         Full order detail with line items and tracking records
  GET    /api/orders/{id}/report  Consolidated JSON report (order header + SKU lines + tracking + totals)
  POST   /api/orders              Create order — auto-resolves SKU prices from the products table,
                                   calculates line totals, subtotal, GST, and total
  PATCH  /api/orders/{id}/status  Update order status (e.g. pending → in_transit → completed)
  DELETE /api/orders/{id}         Delete order and cascade-delete its items + tracking

Price calculation flow (per assessment specification):
  1. For each SKU in the request, look up the product's RRP (unit price, GST-inclusive)
  2. line_total = unit_price × quantity  (Decimal precision)
  3. subtotal   = sum of all line_totals
  4. gst        = subtotal × 10%
  5. total      = subtotal + gst + shipping_fee
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.db_models import Order, OrderItem, Product
from models.schemas import OrderCreate, OrderOut, OrderSummary, PaginatedResponse
from services.price_service import calculate_line_total, calculate_order_totals
from logger import get_logger

log = get_logger("router.orders")
router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=PaginatedResponse)
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query("", description="Filter by status"),
    search: str = Query("", description="Search by order number or customer name"),
    db: Session = Depends(get_db),
):
    """Return paginated order summaries (lightweight — no line items)."""
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    if search:
        pattern = f"%{search}%"
        q = q.filter(Order.order_number.ilike(pattern) | Order.customer_name.ilike(pattern))

    total = q.count()
    orders = (
        q.order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = (total + page_size - 1) // page_size
    summaries = []
    for o in orders:
        summaries.append(
            OrderSummary(
                id=o.id,
                order_number=o.order_number,
                customer_name=o.customer_name,
                company_name=o.company_name or "",
                status=o.status,
                total=o.total,
                item_count=len(o.items),
                created_at=o.created_at,
            )
        )
    log.info("list_orders page=%d total=%d", page, total)
    return PaginatedResponse(
        items=[s.model_dump() for s in summaries],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Fetch full order detail, eagerly loading line items and tracking records."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.tracking_records))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    return order


@router.get("/{order_id}/report")
def get_order_report(order_id: int, db: Session = Depends(get_db)):
    """
    Consolidated order report — single JSON that satisfies all output requirements:
      - Order header (number, status, company, customer, phone, address)
      - SKU lines (unit price, quantities, matched product details, image)
      - Tracking information (carrier, tracking number, status, events)
      - Financial summary (Subtotal, GST, Shipment Fee, Total)
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.tracking_records))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")

    return {
        "order_header": {
            "order_number": order.order_number,
            "order_date": order.created_at.strftime("%d/%m/%y") if order.created_at else None,
            "status": order.status,
            "company_name": order.company_name,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "customer_email": order.customer_email,
            "shipping_address": order.shipping_address,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        },
        "line_items": [
            {
                "sku": item.sku,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
                "assigned_tracking": item.assigned_tracking,
                "image_url": item.image_url,
            }
            for item in order.items
        ],
        "tracking": [
            {
                "tracking_label": t.tracking_label,
                "carrier": t.carrier,
                "tracking_number": t.tracking_number,
                "status": t.status,
                "current_location": t.current_location,
                "estimated_delivery": t.estimated_delivery.isoformat() if t.estimated_delivery else None,
                "events": [
                    {
                        "time": e.event_time.isoformat(),
                        "status": e.status,
                        "location": e.location,
                        "description": e.description,
                    }
                    for e in t.events
                ],
            }
            for t in order.tracking_records
        ],
        "summary": {
            "subtotal": order.subtotal,
            "gst": order.gst,
            "shipping_fee": order.shipping_fee,
            "total": order.total,
        },
    }


@router.post("", response_model=OrderOut, status_code=201)
def create_order(body: OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order with automatic price calculation.
    Each item's SKU is resolved against the products table for its RRP.
    Returns 400 if any SKU is unknown, 409 if order_number already exists.
    """
    if db.query(Order).filter(Order.order_number == body.order_number).first():
        raise HTTPException(409, f"Order {body.order_number} already exists")

    line_items = []
    for item_req in body.items:
        product = db.query(Product).filter(Product.sku == item_req.sku).first()
        if not product:
            raise HTTPException(400, f"Unknown SKU: {item_req.sku}")
        lt = calculate_line_total(product.rrp, item_req.quantity)
        line_items.append(
            {
                "sku": product.sku,
                "product_name": product.name,
                "quantity": item_req.quantity,
                "unit_price": product.rrp,
                "line_total": lt,
                "image_url": product.image_url or "",
            }
        )

    totals = calculate_order_totals(line_items)

    order = Order(
        order_number=body.order_number,
        company_name=body.company_name,
        customer_name=body.customer_name,
        customer_phone=body.customer_phone,
        customer_email=body.customer_email,
        shipping_address=body.shipping_address,
        notes=body.notes,
        subtotal=totals["subtotal"],
        gst=totals["gst"],
        shipping_fee=totals["shipping_fee"],
        total=totals["total"],
    )
    db.add(order)
    db.flush()

    for li in line_items:
        db.add(OrderItem(order_id=order.id, **li))

    db.commit()
    db.refresh(order)
    log.info("Created order: %s with %d items", order.order_number, len(line_items))

    return (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.tracking_records))
        .filter(Order.id == order.id)
        .first()
    )


@router.patch("/{order_id}/status")
def update_order_status(order_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    """Transition an order's status (e.g. pending → in_transit → completed)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = status
    db.commit()
    log.info("Order %s status -> %s", order.order_number, status)
    return {"message": f"Status updated to {status}"}


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Delete an order. Cascade deletes its line items and tracking records."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    db.delete(order)
    db.commit()
    log.info("Deleted order id=%d", order_id)

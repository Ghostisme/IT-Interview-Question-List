"""Seed the database with product data and sample orders matching the assessment specification."""

import sys
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models.db_models import Product, Order, OrderItem, Tracking, TrackingEvent
from services.price_service import calculate_line_total, calculate_order_totals
from utils import parse_numeric, safe_str
from logger import get_logger

log = get_logger("seed")

PRODUCTS = [
    {
        "sku": "TBAMET10",
        "name": "ZenStem 30:15 Indica Pastilles - Live Resin 30-Pack",
        "description": "Pastilles - 30 pack, 30:15 Indica",
        "rrp": 175.00,
        "weight": 0.2,
        "volumetric_gross_weight": 0.2,
        "length": 10.0,
        "width": 10.0,
        "height": 10.0,
        "volume": 1000.0,
        "category": "Pastille",
        "barcode": "998855",
        "dosage_type": "Pastille",
        "product_type": "Finished products",
        "size": "1350",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=TBAMET10",
    },
    {
        "sku": "TBAMET28",
        "name": "ZenStem 30:15 Indica Pastilles - Live Resin 28-Pack",
        "description": "Pastilles - 28 pack, 30:15 Indica",
        "rrp": 165.00,
        "weight": 0.2,
        "volumetric_gross_weight": 0.2,
        "length": 10.0,
        "width": 10.0,
        "height": 10.0,
        "volume": 1000.0,
        "category": "Pastille",
        "barcode": "",
        "dosage_type": "Pastille",
        "product_type": "Finished products",
        "size": "840",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=TBAMET28",
    },
    {
        "sku": "TBOPAL28",
        "name": "ZenStem Opal 28-Pack Pastilles",
        "description": "Opal Pastilles - 28 pack",
        "rrp": 155.00,
        "weight": 0.2,
        "volumetric_gross_weight": 0.2,
        "length": 10.0,
        "width": 10.0,
        "height": 10.0,
        "volume": 1000.0,
        "category": "Pastille",
        "barcode": "",
        "dosage_type": "Pastille",
        "product_type": "Finished products",
        "size": "840",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=TBOPAL28",
    },
    {
        "sku": "HARNIG",
        "name": "Harmony Night Oil",
        "description": "Night Oil",
        "rrp": 145.00,
        "weight": 0.15,
        "volumetric_gross_weight": 0.1,
        "length": 5.0,
        "width": 5.0,
        "height": 10.0,
        "volume": 250.0,
        "category": "Oil",
        "barcode": "",
        "dosage_type": "Oral liquid",
        "product_type": "Finished products",
        "size": "30",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=HARNIG",
    },
    {
        "sku": "LELCBD100",
        "name": "Lemnos Elixir CBD 100",
        "description": "CBD Oil 100mg",
        "rrp": 89.00,
        "weight": 0.1,
        "volumetric_gross_weight": 0.1,
        "length": 5.0,
        "width": 5.0,
        "height": 10.0,
        "volume": 250.0,
        "category": "Oil",
        "barcode": "",
        "dosage_type": "Oral liquid",
        "product_type": "Finished products",
        "size": "30",
        "schedule": "4",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=LELCBD100",
    },
    {
        "sku": "AURPUR10",
        "name": "Aurora Purple 10-Pack",
        "description": "Purple strain 10 pack",
        "rrp": 135.00,
        "weight": 0.3,
        "volumetric_gross_weight": 0.2,
        "length": 10.0,
        "width": 10.0,
        "height": 10.0,
        "volume": 1000.0,
        "category": "Flower",
        "barcode": "",
        "dosage_type": "Herb,dried",
        "product_type": "Finished products",
        "size": "10",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=AURPUR10",
    },
    {
        "sku": "HALGEO15",
        "name": "Halo Geo 15g",
        "description": "Geo strain 15g",
        "rrp": 210.00,
        "weight": 0.15,
        "volumetric_gross_weight": 0.15,
        "length": 10.0,
        "width": 10.0,
        "height": 10.0,
        "volume": 1000.0,
        "category": "Flower",
        "barcode": "",
        "dosage_type": "Herb,dried",
        "product_type": "Finished products",
        "size": "15",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=HALGEO15",
    },
    {
        "sku": "MCMW10",
        "name": "MedCann MW 10g",
        "description": "MW strain 10g",
        "rrp": 149.00,
        "weight": 0.1,
        "volumetric_gross_weight": 0.1,
        "length": 10.0,
        "width": 10.0,
        "height": 10.0,
        "volume": 1000.0,
        "category": "Flower",
        "barcode": "",
        "dosage_type": "Herb,dried",
        "product_type": "Finished products",
        "size": "10",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=MCMW10",
    },
    {
        "sku": "MCBO30",
        "name": "MedCann BO 30ml Oil",
        "description": "BO Oil 30ml",
        "rrp": 195.00,
        "weight": 0.12,
        "volumetric_gross_weight": 0.1,
        "length": 5.0,
        "width": 5.0,
        "height": 10.0,
        "volume": 250.0,
        "category": "Oil",
        "barcode": "",
        "dosage_type": "Oral liquid",
        "product_type": "Finished products",
        "size": "30",
        "schedule": "8",
        "image_url": "https://placehold.co/120x120/e2e8f0/475569?text=MCBO30",
    },
]

_base_time_1 = datetime(2025, 11, 30, 9, 0, 0)
_base_time_2 = datetime(2025, 12, 3, 9, 0, 0)

SAMPLE_ORDERS = [
    {
        "order_number": "PO-20251130-00072",
        "order_date": _base_time_1,
        "company_name": "V22 Dispensary",
        "customer_name": "Jason Hu",
        "customer_phone": "0481 735 488",
        "customer_email": "Jason@aerishealth.au",
        "shipping_address": "125 Toorak Road, South Yarra VIC 3141",
        "status": "completed",
        "items": [
            {"sku": "TBAMET10", "quantity": 3, "assigned_tracking": "Track 1"},
            {"sku": "TBAMET28", "quantity": 1, "assigned_tracking": "Track 1"},
            {"sku": "TBOPAL28", "quantity": 1, "assigned_tracking": "Track 1"},
            {"sku": "HARNIG", "quantity": 4, "assigned_tracking": "Track 1"},
            {"sku": "LELCBD100", "quantity": 6, "assigned_tracking": "Track 1"},
        ],
        "tracking": [
            {
                "carrier": "StarTrack/Auspost",
                "tracking_number": "2FWZ50008569",
                "tracking_label": "Track 1",
                "status": "delivered",
                "current_location": "South Yarra VIC",
                "estimated_delivery": _base_time_1 + timedelta(days=4),
                "events": [
                    {
                        "event_time": _base_time_1,
                        "status": "Order Placed",
                        "location": "Ryde NSW 2111",
                        "description": "Order has been confirmed and is being prepared for shipment.",
                    },
                    {
                        "event_time": _base_time_1 + timedelta(hours=6),
                        "status": "Picked Up",
                        "location": "Ryde NSW 2111",
                        "description": "Package has been picked up by StarTrack courier.",
                    },
                    {
                        "event_time": _base_time_1 + timedelta(days=1, hours=2),
                        "status": "In Transit",
                        "location": "Sydney Distribution Centre",
                        "description": "Package departed from Sydney, heading to Melbourne.",
                    },
                    {
                        "event_time": _base_time_1 + timedelta(days=2, hours=5),
                        "status": "Arrived",
                        "location": "Melbourne Distribution Centre",
                        "description": "Package arrived at Melbourne distribution centre.",
                    },
                    {
                        "event_time": _base_time_1 + timedelta(days=3, hours=1),
                        "status": "Out for Delivery",
                        "location": "South Yarra VIC",
                        "description": "Package is out for delivery to 125 Toorak Road.",
                    },
                    {
                        "event_time": _base_time_1 + timedelta(days=3, hours=6),
                        "status": "Delivered",
                        "location": "125 Toorak Road, South Yarra VIC 3141",
                        "description": "Package has been delivered successfully. Signed by Jason H.",
                    },
                ],
            },
        ],
    },
    {
        "order_number": "PO-20251202-00046",
        "order_date": _base_time_2,
        "company_name": "Cann Life Dispensary",
        "customer_name": "Bella Dari",
        "customer_phone": "0411 547 288",
        "customer_email": "Bella@aerishealth.au",
        "shipping_address": "381 Smith Street, Fitzroy VIC 3065",
        "status": "in_transit",
        "items": [
            {"sku": "AURPUR10", "quantity": 10, "assigned_tracking": "Track 2"},
            {"sku": "HALGEO15", "quantity": 1, "assigned_tracking": "Track 3"},
            {"sku": "MCMW10", "quantity": 2, "assigned_tracking": "Track 3"},
            {"sku": "MCBO30", "quantity": 3, "assigned_tracking": "Track 3"},
        ],
        "tracking": [
            {
                "carrier": "StarTrack/Auspost",
                "tracking_number": "2FWZ50008645",
                "tracking_label": "Track 2",
                "status": "in_transit",
                "current_location": "Canberra Sort Facility",
                "estimated_delivery": _base_time_2 + timedelta(days=5),
                "events": [
                    {
                        "event_time": _base_time_2,
                        "status": "Order Placed",
                        "location": "Ryde NSW 2111",
                        "description": "Order confirmed, preparing shipment.",
                    },
                    {
                        "event_time": _base_time_2 + timedelta(hours=8),
                        "status": "Picked Up",
                        "location": "Ryde NSW 2111",
                        "description": "Package collected by StarTrack courier.",
                    },
                    {
                        "event_time": _base_time_2 + timedelta(days=1, hours=3),
                        "status": "In Transit",
                        "location": "Sydney Distribution Centre",
                        "description": "Package departed from Sydney, heading to Melbourne.",
                    },
                    {
                        "event_time": _base_time_2 + timedelta(days=2, hours=2),
                        "status": "Processing",
                        "location": "Canberra Sort Facility",
                        "description": "Package is being sorted at interim facility.",
                    },
                ],
            },
            {
                "carrier": "TNT",
                "tracking_number": "305506914",
                "tracking_label": "Track 3",
                "status": "pending",
                "current_location": "Ryde NSW 2111",
                "estimated_delivery": _base_time_2 + timedelta(days=6),
                "events": [
                    {
                        "event_time": _base_time_2,
                        "status": "Order Placed",
                        "location": "Ryde NSW 2111",
                        "description": "Merchant is preparing shipment.",
                    },
                ],
            },
        ],
    },
]


def seed_products(db: Session):
    for p in PRODUCTS:
        exists = db.query(Product).filter(Product.sku == p["sku"]).first()
        if exists:
            log.info("Product %s already exists, skipping", p["sku"])
            continue
        db.add(Product(**p))
        log.info("Added product: %s", p["sku"])
    db.commit()


def seed_orders(db: Session):
    product_map: dict[str, Product] = {}
    for p in db.query(Product).all():
        product_map[p.sku] = p

    for order_data in SAMPLE_ORDERS:
        if db.query(Order).filter(Order.order_number == order_data["order_number"]).first():
            log.info("Order %s already exists, skipping", order_data["order_number"])
            continue

        line_items_data = []
        for item in order_data["items"]:
            prod = product_map.get(item["sku"])
            if not prod:
                log.warning("SKU %s not found in products, skipping", item["sku"])
                continue
            lt = calculate_line_total(prod.rrp, item["quantity"])
            line_items_data.append({
                "sku": prod.sku,
                "product_name": prod.name,
                "quantity": item["quantity"],
                "unit_price": prod.rrp,
                "line_total": lt,
                "assigned_tracking": item.get("assigned_tracking", ""),
                "image_url": prod.image_url or "",
            })

        totals = calculate_order_totals(line_items_data)

        order = Order(
            order_number=order_data["order_number"],
            company_name=order_data.get("company_name", ""),
            customer_name=order_data["customer_name"],
            customer_phone=order_data.get("customer_phone", ""),
            customer_email=order_data["customer_email"],
            shipping_address=order_data["shipping_address"],
            status=order_data["status"],
            subtotal=totals["subtotal"],
            gst=totals["gst"],
            shipping_fee=totals["shipping_fee"],
            total=totals["total"],
            created_at=order_data.get("order_date", datetime.utcnow()),
        )
        db.add(order)
        db.flush()

        for li in line_items_data:
            db.add(OrderItem(order_id=order.id, **li))

        for t in order_data.get("tracking", []):
            tracking = Tracking(
                order_id=order.id,
                carrier=t["carrier"],
                tracking_number=t["tracking_number"],
                tracking_label=t.get("tracking_label", ""),
                status=t["status"],
                current_location=t.get("current_location", ""),
                estimated_delivery=t.get("estimated_delivery"),
            )
            db.add(tracking)
            db.flush()

            for evt in t.get("events", []):
                db.add(
                    TrackingEvent(
                        tracking_id=tracking.id,
                        event_time=evt["event_time"],
                        status=evt["status"],
                        location=evt["location"],
                        description=evt["description"],
                    )
                )

        log.info("Created order: %s (%d items)", order.order_number, len(line_items_data))

    db.commit()


def main():
    log.info("=== Starting database seed ===")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_products(db)
        seed_orders(db)
        log.info("=== Seed complete ===")
    except Exception as exc:
        db.rollback()
        log.error("Seed failed: %s", exc, exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

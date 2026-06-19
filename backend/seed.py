"""Seed the database with product data and sample orders."""

import sys
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from models.db_models import Product, Order, OrderItem, Tracking, TrackingEvent
from logger import get_logger

log = get_logger("seed")

PRODUCTS = [
    {
        "sku": "TBAMET10",
        "name": "ZenStem 30:15 Indica Pastilles - Live Resin 30-Pack",
        "description": "Pastilles - 30 pack, 30:15 Indica",
        "rrp": 175.00,
        "weight": 0.2,
        "category": "Pastille",
    },
    {
        "sku": "TBAMET28",
        "name": "ZenStem 30:15 Indica Pastilles - Live Resin 28-Pack",
        "description": "Pastilles - 28 pack, 30:15 Indica",
        "rrp": 165.00,
        "weight": 0.2,
        "category": "Pastille",
    },
    {
        "sku": "TBOPAL28",
        "name": "ZenStem Opal 28-Pack Pastilles",
        "description": "Opal Pastilles - 28 pack",
        "rrp": 155.00,
        "weight": 0.2,
        "category": "Pastille",
    },
    {
        "sku": "HARNIG",
        "name": "Harmony Night Oil",
        "description": "Night Oil",
        "rrp": 145.00,
        "weight": 0.15,
        "category": "Oil",
    },
    {
        "sku": "LELCBD100",
        "name": "Lemnos Elixir CBD 100",
        "description": "CBD Oil 100mg",
        "rrp": 89.00,
        "weight": 0.1,
        "category": "Oil",
    },
    {
        "sku": "AURPUR10",
        "name": "Aurora Purple 10-Pack",
        "description": "Purple strain 10 pack",
        "rrp": 135.00,
        "weight": 0.3,
        "category": "Flower",
    },
    {
        "sku": "HALGEO15",
        "name": "Halo Geo 15g",
        "description": "Geo strain 15g",
        "rrp": 210.00,
        "weight": 0.15,
        "category": "Flower",
    },
    {
        "sku": "MCMW10",
        "name": "MedCann MW 10g",
        "description": "MW strain 10g",
        "rrp": 149.00,
        "weight": 0.1,
        "category": "Flower",
    },
    {
        "sku": "MCBO30",
        "name": "MedCann BO 30ml Oil",
        "description": "BO Oil 30ml",
        "rrp": 195.00,
        "weight": 0.12,
        "category": "Oil",
    },
]

_base_time = datetime(2025, 11, 30, 9, 0, 0)

SAMPLE_ORDERS = [
    {
        "order_number": "PO-20251130-00072",
        "customer_name": "Jason Hu",
        "customer_email": "jason@v22dispensary.com",
        "shipping_address": "V22 Dispensary, 45 Oxford St, Sydney NSW 2000",
        "status": "completed",
        "items": [
            {"sku": "TBAMET10", "quantity": 3},
            {"sku": "TBAMET28", "quantity": 1},
            {"sku": "TBOPAL28", "quantity": 1},
            {"sku": "HARNIG", "quantity": 4},
            {"sku": "LELCBD100", "quantity": 6},
        ],
        "tracking": [
            {
                "carrier": "StarTrack",
                "tracking_number": "ABC123456789",
                "status": "delivered",
                "current_location": "Sydney Distribution Centre",
                "estimated_delivery": _base_time + timedelta(days=4),
                "events": [
                    {
                        "event_time": _base_time,
                        "status": "Order Placed",
                        "location": "Melbourne Warehouse",
                        "description": "Order has been confirmed and is being prepared for shipment.",
                    },
                    {
                        "event_time": _base_time + timedelta(hours=6),
                        "status": "Picked Up",
                        "location": "Melbourne Warehouse",
                        "description": "Package has been picked up by StarTrack courier.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=1, hours=2),
                        "status": "In Transit",
                        "location": "Melbourne Distribution Centre",
                        "description": "Package departed from Melbourne, heading to Sydney.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=2, hours=5),
                        "status": "Arrived",
                        "location": "Sydney Distribution Centre",
                        "description": "Package arrived at Sydney distribution centre.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=3, hours=1),
                        "status": "Out for Delivery",
                        "location": "Sydney Local Depot",
                        "description": "Package is out for delivery to destination.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=3, hours=6),
                        "status": "Delivered",
                        "location": "V22 Dispensary, Sydney NSW",
                        "description": "Package has been delivered successfully. Signed by Jason H.",
                    },
                ],
            },
        ],
    },
    {
        "order_number": "PO-20251203-00046",
        "customer_name": "Bella Dari",
        "customer_email": "bella@cannlife.com",
        "shipping_address": "Cann Life Dispensary, 120 Collins St, Melbourne VIC 3000",
        "status": "in_transit",
        "items": [
            {"sku": "AURPUR10", "quantity": 10},
            {"sku": "HALGEO15", "quantity": 1},
            {"sku": "MCMW10", "quantity": 2},
            {"sku": "MCBO30", "quantity": 3},
        ],
        "tracking": [
            {
                "carrier": "StarTrack",
                "tracking_number": "DEF987654321",
                "status": "in_transit",
                "current_location": "Sydney Distribution Centre",
                "estimated_delivery": _base_time + timedelta(days=8),
                "events": [
                    {
                        "event_time": _base_time + timedelta(days=3),
                        "status": "Order Placed",
                        "location": "Sydney Warehouse",
                        "description": "Order confirmed, preparing shipment.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=3, hours=8),
                        "status": "Picked Up",
                        "location": "Sydney Warehouse",
                        "description": "Package collected by StarTrack courier.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=4, hours=3),
                        "status": "In Transit",
                        "location": "Sydney Distribution Centre",
                        "description": "Package departed from Sydney, heading to Melbourne.",
                    },
                    {
                        "event_time": _base_time + timedelta(days=5, hours=2),
                        "status": "Processing",
                        "location": "Canberra Sort Facility",
                        "description": "Package is being sorted at interim facility.",
                    },
                ],
            },
            {
                "carrier": "TNT",
                "tracking_number": "GHI111222333",
                "status": "pending",
                "current_location": "Sydney Warehouse",
                "estimated_delivery": _base_time + timedelta(days=9),
                "events": [
                    {
                        "event_time": _base_time + timedelta(days=3),
                        "status": "Order Placed",
                        "location": "Sydney Warehouse",
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

        subtotal = 0.0
        line_items = []
        for item in order_data["items"]:
            prod = product_map.get(item["sku"])
            if not prod:
                log.warning("SKU %s not found in products, skipping", item["sku"])
                continue
            lt = round(prod.rrp * item["quantity"], 2)
            subtotal += lt
            line_items.append(
                OrderItem(
                    sku=prod.sku,
                    product_name=prod.name,
                    quantity=item["quantity"],
                    unit_price=prod.rrp,
                    line_total=lt,
                )
            )

        gst = round(subtotal * 10 / 110, 2)

        order = Order(
            order_number=order_data["order_number"],
            customer_name=order_data["customer_name"],
            customer_email=order_data["customer_email"],
            shipping_address=order_data["shipping_address"],
            status=order_data["status"],
            subtotal=subtotal,
            gst=gst,
            total=subtotal,
        )
        db.add(order)
        db.flush()

        for li in line_items:
            li.order_id = order.id
            db.add(li)

        for t in order_data.get("tracking", []):
            tracking = Tracking(
                order_id=order.id,
                carrier=t["carrier"],
                tracking_number=t["tracking_number"],
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

        log.info("Created order: %s (%d items)", order.order_number, len(line_items))

    db.commit()


def main():
    log.info("=== Starting database seed ===")
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

import pytest
from models.db_models import Product, Order, OrderItem


def _create_order_with_items(db):
    p = Product(sku="TRK_SKU", name="Track Product", rrp=50.0, weight=0.1, category="Oil")
    db.add(p)
    db.flush()
    o = Order(order_number="PO-TRACK-001", customer_name="Tracker", subtotal=50.0, gst=4.55, total=50.0)
    db.add(o)
    db.flush()
    db.add(OrderItem(order_id=o.id, sku="TRK_SKU", product_name="Track Product", quantity=1, unit_price=50.0, line_total=50.0))
    db.commit()
    return o


def test_add_tracking(client, db):
    order = _create_order_with_items(db)
    resp = client.post(
        f"/api/tracking/{order.id}",
        json={
            "carrier": "StarTrack",
            "tracking_number": "TRACK123",
            "status": "in_transit",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["tracking_number"] == "TRACK123"


def test_list_tracking(client, db):
    order = _create_order_with_items(db)
    client.post(
        f"/api/tracking/{order.id}",
        json={"carrier": "StarTrack", "tracking_number": "LIST_T1", "status": "pending"},
    )
    client.post(
        f"/api/tracking/{order.id}",
        json={"carrier": "TNT", "tracking_number": "LIST_T2", "status": "pending"},
    )
    resp = client.get(f"/api/tracking/{order.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_add_tracking_order_not_found(client):
    resp = client.post(
        "/api/tracking/9999",
        json={"carrier": "StarTrack", "tracking_number": "T99", "status": "pending"},
    )
    assert resp.status_code == 404

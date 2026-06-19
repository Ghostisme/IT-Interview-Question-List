from models.db_models import Product


def _seed_products(db):
    products = [
        Product(sku="SKU_A", name="Product A", rrp=100.0, weight=0.5, category="Oil"),
        Product(sku="SKU_B", name="Product B", rrp=200.0, weight=0.3, category="Flower"),
    ]
    for p in products:
        db.add(p)
    db.commit()


def test_create_order(client, db):
    _seed_products(db)
    order_data = {
        "order_number": "PO-TEST-001",
        "company_name": "Test Company",
        "customer_name": "Test User",
        "customer_phone": "0400 000 000",
        "customer_email": "test@example.com",
        "shipping_address": "123 Test St, VIC 3000",
        "items": [
            {"sku": "SKU_A", "quantity": 2},
            {"sku": "SKU_B", "quantity": 1},
        ],
    }
    resp = client.post("/api/orders", json=order_data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["order_number"] == "PO-TEST-001"
    assert body["company_name"] == "Test Company"
    assert body["customer_phone"] == "0400 000 000"
    assert len(body["items"]) == 2
    assert body["subtotal"] == 400.0  # 100*2 + 200*1
    assert body["gst"] == 40.0  # 400 * 10%
    assert body["total"] == 440.0  # 400 + 40 + 0


def test_create_order_unknown_sku(client, db):
    _seed_products(db)
    resp = client.post(
        "/api/orders",
        json={
            "order_number": "PO-BAD-001",
            "items": [{"sku": "NONEXIST", "quantity": 1}],
        },
    )
    assert resp.status_code == 400


def test_create_duplicate_order(client, db):
    _seed_products(db)
    data = {
        "order_number": "PO-DUP-001",
        "items": [{"sku": "SKU_A", "quantity": 1}],
    }
    client.post("/api/orders", json=data)
    resp = client.post("/api/orders", json=data)
    assert resp.status_code == 409


def test_get_order(client, db):
    _seed_products(db)
    resp = client.post(
        "/api/orders",
        json={
            "order_number": "PO-GET-001",
            "customer_name": "Getter",
            "items": [{"sku": "SKU_A", "quantity": 1}],
        },
    )
    order_id = resp.json()["id"]
    resp = client.get(f"/api/orders/{order_id}")
    assert resp.status_code == 200
    assert resp.json()["order_number"] == "PO-GET-001"


def test_list_orders(client, db):
    _seed_products(db)
    client.post(
        "/api/orders",
        json={"order_number": "PO-LIST-001", "items": [{"sku": "SKU_A", "quantity": 1}]},
    )
    resp = client.get("/api/orders")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_update_order_status(client, db):
    _seed_products(db)
    resp = client.post(
        "/api/orders",
        json={"order_number": "PO-STATUS-001", "items": [{"sku": "SKU_A", "quantity": 1}]},
    )
    order_id = resp.json()["id"]
    resp = client.patch(f"/api/orders/{order_id}/status?status=shipped")
    assert resp.status_code == 200


def test_delete_order(client, db):
    _seed_products(db)
    resp = client.post(
        "/api/orders",
        json={"order_number": "PO-DEL-001", "items": [{"sku": "SKU_A", "quantity": 1}]},
    )
    order_id = resp.json()["id"]
    resp = client.delete(f"/api/orders/{order_id}")
    assert resp.status_code == 204
    resp = client.get(f"/api/orders/{order_id}")
    assert resp.status_code == 404


def test_order_report(client, db):
    _seed_products(db)
    resp = client.post(
        "/api/orders",
        json={
            "order_number": "PO-REPORT-001",
            "company_name": "Report Corp",
            "customer_name": "Reporter",
            "customer_phone": "0411 111 111",
            "items": [{"sku": "SKU_A", "quantity": 3}],
        },
    )
    order_id = resp.json()["id"]
    resp = client.get(f"/api/orders/{order_id}/report")
    assert resp.status_code == 200
    report = resp.json()
    assert report["order_header"]["company_name"] == "Report Corp"
    assert report["order_header"]["customer_phone"] == "0411 111 111"
    assert len(report["line_items"]) == 1
    assert report["summary"]["subtotal"] == 300.0
    assert report["summary"]["gst"] == 30.0
    assert report["summary"]["total"] == 330.0

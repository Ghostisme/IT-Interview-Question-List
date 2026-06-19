def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_create_product(client):
    data = {
        "sku": "NEW001",
        "name": "New Product",
        "rrp": 50.0,
        "weight": 0.3,
        "category": "Oil",
    }
    resp = client.post("/api/products", json=data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["sku"] == "NEW001"
    assert body["rrp"] == 50.0


def test_create_duplicate_product(client):
    data = {"sku": "DUP01", "name": "Dup", "rrp": 10.0}
    client.post("/api/products", json=data)
    resp = client.post("/api/products", json=data)
    assert resp.status_code == 409


def test_get_product(client, sample_product):
    resp = client.get(f"/api/products/{sample_product.sku}")
    assert resp.status_code == 200
    assert resp.json()["sku"] == "TEST001"


def test_get_product_not_found(client):
    resp = client.get("/api/products/NONEXIST")
    assert resp.status_code == 404


def test_list_products(client, sample_product):
    resp = client.get("/api/products")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert len(body["items"]) >= 1


def test_list_products_search(client, sample_product):
    resp = client.get("/api/products?search=TEST")
    body = resp.json()
    assert body["total"] >= 1


def test_update_product(client, sample_product):
    resp = client.put(
        f"/api/products/{sample_product.sku}",
        json={"name": "Updated Name", "rrp": 120.0},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"
    assert resp.json()["rrp"] == 120.0


def test_delete_product(client, sample_product):
    resp = client.delete(f"/api/products/{sample_product.sku}")
    assert resp.status_code == 204
    resp = client.get(f"/api/products/{sample_product.sku}")
    assert resp.status_code == 404


def test_list_categories(client, sample_product):
    resp = client.get("/api/products/categories")
    assert resp.status_code == 200
    cats = resp.json()
    assert any(c["category"] == "Test" for c in cats)

from services.price_service import calculate_line_total, calculate_order_totals


def test_line_total_basic():
    assert calculate_line_total(100.0, 2) == 200.0


def test_line_total_decimal():
    assert calculate_line_total(33.33, 3) == 99.99


def test_line_total_single():
    assert calculate_line_total(175.00, 1) == 175.00


def test_order_totals_single_item():
    items = [{"unit_price": 100.0, "quantity": 1}]
    result = calculate_order_totals(items)
    assert result["subtotal"] == 100.0
    assert result["gst"] == 10.0  # 100 * 10% per assessment spec
    assert result["shipping_fee"] == 0.0
    assert result["total"] == 110.0  # 100 + 10 + 0


def test_order_totals_multiple_items():
    items = [
        {"unit_price": 175.0, "quantity": 3},
        {"unit_price": 165.0, "quantity": 1},
        {"unit_price": 155.0, "quantity": 1},
    ]
    result = calculate_order_totals(items)
    expected_subtotal = 175 * 3 + 165 + 155  # 845.0
    assert result["subtotal"] == expected_subtotal
    expected_gst = round(845 * 0.10, 2)  # 84.50
    assert result["gst"] == expected_gst
    assert result["total"] == round(expected_subtotal + expected_gst, 2)


def test_order_totals_with_shipping():
    items = [{"unit_price": 100.0, "quantity": 1}]
    result = calculate_order_totals(items, shipping_fee=15.50)
    assert result["subtotal"] == 100.0
    assert result["gst"] == 10.0
    assert result["shipping_fee"] == 15.50
    assert result["total"] == 125.50  # 100 + 10 + 15.50


def test_order_totals_zero():
    items = [{"unit_price": 0.0, "quantity": 5}]
    result = calculate_order_totals(items)
    assert result["subtotal"] == 0.0
    assert result["gst"] == 0.0
    assert result["total"] == 0.0

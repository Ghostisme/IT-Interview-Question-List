from datetime import datetime
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    sku: str
    name: str
    description: str = ""
    rrp: float = Field(..., description="Unit price USD, GST inclusive")
    weight: float = 0.0
    volumetric_gross_weight: float = 0.0
    length: float = 0.0
    width: float = 0.0
    height: float = 0.0
    volume: float = 0.0
    category: str = ""
    barcode: str = ""
    dosage_type: str = ""
    product_type: str = ""
    size: str = ""
    schedule: str = ""
    image_url: str = ""
    stock_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    rrp: float | None = None
    weight: float | None = None
    volumetric_gross_weight: float | None = None
    length: float | None = None
    width: float | None = None
    height: float | None = None
    volume: float | None = None
    category: str | None = None
    barcode: str | None = None
    dosage_type: str | None = None
    product_type: str | None = None
    size: str | None = None
    schedule: str | None = None
    image_url: str | None = None
    stock_quantity: int | None = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderItemBase(BaseModel):
    sku: str
    product_name: str = ""
    quantity: int = 1
    unit_price: float
    line_total: float
    assigned_tracking: str = ""
    image_url: str = ""


class OrderItemCreate(BaseModel):
    sku: str
    quantity: int = 1


class OrderItemOut(OrderItemBase):
    id: int

    model_config = {"from_attributes": True}


class TrackingEventOut(BaseModel):
    id: int
    event_time: datetime
    status: str
    location: str
    description: str

    model_config = {"from_attributes": True}


class TrackingBase(BaseModel):
    carrier: str
    tracking_number: str
    tracking_label: str = ""
    status: str = "pending"
    status_detail: str = ""
    current_location: str = ""
    estimated_delivery: datetime | None = None


class TrackingCreate(TrackingBase):
    pass


class TrackingOut(TrackingBase):
    id: int
    order_id: int
    last_updated: datetime
    events: list[TrackingEventOut] = []

    model_config = {"from_attributes": True}


class OrderBase(BaseModel):
    order_number: str
    company_name: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    customer_email: str = ""
    shipping_address: str = ""
    notes: str = ""


class OrderCreate(OrderBase):
    items: list[OrderItemCreate]


class OrderOut(OrderBase):
    id: int
    status: str
    subtotal: float
    gst: float
    shipping_fee: float
    total: float
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut] = []
    tracking_records: list[TrackingOut] = []

    model_config = {"from_attributes": True}


class OrderSummary(BaseModel):
    id: int
    order_number: str
    customer_name: str
    company_name: str = ""
    status: str
    total: float
    item_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


class ShippingQuoteRequest(BaseModel):
    from_postcode: str
    to_postcode: str
    weight: float = Field(..., gt=0, description="Weight in kg")
    length: float = Field(default=20.0, gt=0)
    width: float = Field(default=15.0, gt=0)
    height: float = Field(default=10.0, gt=0)


class ShippingQuoteOut(BaseModel):
    service_name: str
    service_code: str
    price: float
    estimated_days: str = ""


class TrackingQueryOut(BaseModel):
    carrier: str
    tracking_number: str
    status: str
    events: list[dict] = []
    raw: dict = {}

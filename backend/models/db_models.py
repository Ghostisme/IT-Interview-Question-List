"""
models/db_models.py — SQLAlchemy ORM model definitions.

Database schema overview (5 tables):

  products        SKU product catalog (sku, name, rrp, weight, category)
       │
  orders          Purchase orders (order_number, customer, status, totals)
       │
       ├── order_items    Line items linking orders ↔ products (qty, unit_price, line_total)
       │
       └── tracking       Shipment tracking records (carrier, tracking_number, status)
               │
               └── tracking_events  Timeline events for each tracking record
                                     (event_time, status, location, description)

Key design decisions:
  - CASCADE deletes: deleting an order removes its items and tracking
  - Composite indexes for common query patterns (status+date, order_id+sku)
  - RRP stored as Float with GST-inclusive USD pricing
"""

from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Index,
)
from sqlalchemy.orm import relationship

from database import Base


class Product(Base):
    """SKU product catalog — seeded from external SQL query results."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    rrp = Column(Float, nullable=False, comment="Unit price in USD, GST inclusive")
    weight = Column(Float, default=0.0, comment="Weight in kg")
    category = Column(String(100), default="")
    stock_quantity = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_product_category", "category"),
        Index("idx_product_rrp", "rrp"),
    )

    def __repr__(self):
        return f"<Product sku={self.sku} name={self.name}>"


class Order(Base):
    """
    Purchase order header.
    Financial fields (subtotal/gst/total) are computed during creation
    based on line item prices from the products table.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_name = Column(String(255), default="")
    customer_email = Column(String(255), default="")
    shipping_address = Column(Text, default="")
    status = Column(String(50), default="pending", index=True)
    subtotal = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    shipping_fee = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    tracking_records = relationship("Tracking", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_order_status_date", "status", "created_at"),
    )

    def __repr__(self):
        return f"<Order {self.order_number} status={self.status}>"


class OrderItem(Base):
    """
    Order line item — snapshot of product info at order time.
    Stores unit_price separately from the products table so that
    price changes don't retroactively affect historical orders.
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    sku = Column(String(50), nullable=False, index=True)
    product_name = Column(String(255), default="")
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, comment="USD, GST inclusive")
    line_total = Column(Float, nullable=False, comment="quantity * unit_price")

    order = relationship("Order", back_populates="items")

    __table_args__ = (
        Index("idx_orderitem_order_sku", "order_id", "sku"),
    )

    def __repr__(self):
        return f"<OrderItem sku={self.sku} qty={self.quantity}>"


class Tracking(Base):
    """
    Shipment tracking record — links an order to a carrier consignment.
    Each tracking record can have multiple TrackingEvents forming a timeline.
    """
    __tablename__ = "tracking"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    carrier = Column(String(50), nullable=False, comment="StarTrack / TNT / AusPost")
    tracking_number = Column(String(100), nullable=False, index=True)
    status = Column(String(100), default="pending")
    status_detail = Column(Text, default="")
    current_location = Column(String(255), default="")
    estimated_delivery = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="tracking_records")
    events = relationship("TrackingEvent", back_populates="tracking", cascade="all, delete-orphan", order_by="TrackingEvent.event_time.desc()")

    __table_args__ = (
        Index("idx_tracking_carrier", "carrier"),
    )

    def __repr__(self):
        return f"<Tracking {self.carrier} {self.tracking_number}>"


class TrackingEvent(Base):
    """
    Individual event in a shipment's logistics timeline.
    Displayed chronologically on the Logistics page as a vertical timeline.
    Example statuses: Order Placed → Picked Up → In Transit → Delivered
    """
    __tablename__ = "tracking_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tracking_id = Column(Integer, ForeignKey("tracking.id", ondelete="CASCADE"), nullable=False)
    event_time = Column(DateTime, nullable=False)
    status = Column(String(100), nullable=False)
    location = Column(String(255), default="")
    description = Column(Text, default="")

    tracking = relationship("Tracking", back_populates="events")

    __table_args__ = (
        Index("idx_event_tracking_time", "tracking_id", "event_time"),
    )

    def __repr__(self):
        return f"<TrackingEvent {self.status} @ {self.location}>"

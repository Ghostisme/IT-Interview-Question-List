"""
routers/products.py — Product CRUD API endpoints.

Endpoints:
  GET    /api/products           List products (paginated, searchable by SKU/name, filterable by category)
  GET    /api/products/categories   Aggregate product counts grouped by category
  GET    /api/products/{sku}     Retrieve a single product by its SKU code
  POST   /api/products           Create a new product (409 if SKU already exists)
  PUT    /api/products/{sku}     Partial update — only provided fields are modified
  DELETE /api/products/{sku}     Remove a product by SKU
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.db_models import Product
from models.schemas import ProductCreate, ProductUpdate, ProductOut, PaginatedResponse
from logger import get_logger

log = get_logger("router.products")
router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=PaginatedResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search by SKU or name"),
    category: str = Query("", description="Filter by category"),
    db: Session = Depends(get_db),
):
    """Return a paginated list of products with optional search and category filter."""
    q = db.query(Product)
    if search:
        pattern = f"%{search}%"
        q = q.filter(Product.sku.ilike(pattern) | Product.name.ilike(pattern))
    if category:
        q = q.filter(Product.category == category)

    total = q.count()
    items = (
        q.order_by(Product.sku)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = (total + page_size - 1) // page_size
    log.info("list_products page=%d total=%d", page, total)
    return PaginatedResponse(
        items=[ProductOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """Return all distinct product categories with their product counts."""
    rows = db.query(Product.category, func.count(Product.id)).group_by(Product.category).all()
    return [{"category": r[0] or "Uncategorized", "count": r[1]} for r in rows]


@router.get("/{sku}", response_model=ProductOut)
def get_product(sku: str, db: Session = Depends(get_db)):
    """Fetch a single product by SKU. Returns 404 if not found."""
    product = db.query(Product).filter(Product.sku == sku).first()
    if not product:
        raise HTTPException(404, f"Product {sku} not found")
    return product


@router.post("", response_model=ProductOut, status_code=201)
def create_product(body: ProductCreate, db: Session = Depends(get_db)):
    """Insert a new product. Returns 409 if the SKU already exists (prevents duplicates)."""
    if db.query(Product).filter(Product.sku == body.sku).first():
        raise HTTPException(409, f"Product {body.sku} already exists")
    product = Product(**body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    log.info("Created product: %s", product.sku)
    return product


@router.put("/{sku}", response_model=ProductOut)
def update_product(sku: str, body: ProductUpdate, db: Session = Depends(get_db)):
    """Update product fields. Only fields present in the request body are modified."""
    product = db.query(Product).filter(Product.sku == sku).first()
    if not product:
        raise HTTPException(404, f"Product {sku} not found")
    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    log.info("Updated product: %s fields=%s", sku, list(updates.keys()))
    return product


@router.delete("/{sku}", status_code=204)
def delete_product(sku: str, db: Session = Depends(get_db)):
    """Delete a product by SKU. Returns 404 if not found."""
    product = db.query(Product).filter(Product.sku == sku).first()
    if not product:
        raise HTTPException(404, f"Product {sku} not found")
    db.delete(product)
    db.commit()
    log.info("Deleted product: %s", sku)

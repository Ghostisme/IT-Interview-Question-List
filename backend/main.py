"""
main.py — FastAPI application entry point.

Responsibilities:
  - Create and configure the FastAPI app instance
  - Register CORS middleware (allowed origins read from .env)
  - Wire up all API routers (products, orders, tracking)
  - Provide a global exception handler that logs unhandled errors
  - Initialize the database on startup via the lifespan hook
  - Expose a /api/health endpoint for liveness checks
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from database import init_db
from logger import get_logger
from routers import products, orders, tracking

log = get_logger("main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: creates DB tables on startup, logs shutdown."""
    log.info("Starting application — initialising database")
    init_db()
    yield
    log.info("Shutting down application")


app = FastAPI(
    title="Order Tracking System",
    version="1.0.0",
    description="Order management with AusPost/StarTrack/TNT tracking integration",
    lifespan=lifespan,
)

# CORS: allow the frontend dev server and any additional origins from .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — prevents raw stack traces from leaking to clients."""
    log.error("Unhandled error on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Mount route modules
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(tracking.router)


@app.get("/api/health")
def health():
    """Simple liveness probe — returns 200 with version info."""
    return {"status": "ok", "version": "1.0.0"}

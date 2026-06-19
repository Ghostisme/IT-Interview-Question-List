"""
database.py — SQLAlchemy engine, session factory, and base model.

Key design decisions:
  - SQLite with WAL journal mode for concurrent read performance
  - Foreign keys enforced at the SQLite level via PRAGMA
  - Session obtained through a FastAPI dependency (get_db) that
    guarantees cleanup via try/finally
  - init_db() called once at application startup to ensure all
    ORM-declared tables exist
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import get_settings
from logger import get_logger

log = get_logger("database")

settings = get_settings()
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite + threads
    echo=settings.DEBUG,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    """Enable WAL mode (better concurrency) and FK enforcement on every connection."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Declarative base class — all ORM models inherit from this."""
    pass


def get_db():
    """FastAPI dependency: yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables defined by ORM models (idempotent — safe to call repeatedly)."""
    Base.metadata.create_all(bind=engine)
    log.info("Database tables created")

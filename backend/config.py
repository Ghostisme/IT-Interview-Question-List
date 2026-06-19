"""
config.py — Centralized configuration using pydantic-settings.

All sensitive values (API keys, passwords) are loaded from the .env file
and are NOT hardcoded. The Settings class validates types and provides
sensible defaults for non-sensitive fields.

Usage:
    from config import get_settings
    settings = get_settings()          # singleton (cached via lru_cache)
    print(settings.AUSPOST_API_KEY)
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # --- Database ---
    DATABASE_URL: str = "sqlite:///./app.db"

    # --- AusPost / StarTrack API credentials ---
    AUSPOST_API_KEY: str = ""
    AUSPOST_PASSWORD: str = ""
    AUSPOST_ACCOUNT_NUMBER: str = ""
    STARTRACK_ACCOUNT_NUMBER: str = ""

    # --- TNT API credentials (degraded mode — auth issues unresolved) ---
    TNT_USERNAME: str = ""
    TNT_PASSWORD: str = ""
    TNT_ACCOUNT: str = ""
    TNT_TRACKING_USERNAME: str = ""
    TNT_TRACKING_PASSWORD: str = ""

    # --- CORS / Debug ---
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    DEBUG: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origin_list(self) -> list[str]:
        """Split comma-separated CORS_ORIGINS into a list for the middleware."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings singleton — reads .env only once."""
    return Settings()

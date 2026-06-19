"""
utils.py — Data parsing helpers with fault tolerance.

Handles the unit-suffixed values returned by the Google Apps Script
SQL query (e.g. "10.0mm", "0.2kg", "1000.0mm³", "nullDays").
"""

import re
from logger import get_logger

log = get_logger("utils")

_NUM_RE = re.compile(r"^([+-]?\d+(?:\.\d+)?)")


def parse_numeric(value, default: float = 0.0) -> float:
    """
    Extract a numeric value from a potentially unit-suffixed string.

    Examples:
        "10.0mm"      → 10.0
        "0.2kg"       → 0.2
        "1000.0mm³"   → 1000.0
        "nullDays"    → 0.0 (default)
        ""            → 0.0 (default)
        None          → 0.0 (default)
        42.5          → 42.5 (pass-through)
    """
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return default
    m = _NUM_RE.match(s)
    if m:
        try:
            return float(m.group(1))
        except (ValueError, OverflowError):
            log.warning("Failed to convert '%s' to float, using default %.2f", value, default)
            return default
    log.debug("No numeric value in '%s', using default %.2f", value, default)
    return default


def safe_str(value, default: str = "") -> str:
    """Return a trimmed string, or default if None/empty."""
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default

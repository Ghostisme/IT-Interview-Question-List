"""
logger.py — Unified logging configuration for the application.

All modules use `get_logger(__name__)` to obtain a logger that writes to:
  1. Console (stdout) — for real-time development feedback
  2. File (logs/app.log) — for persistent audit trail and debugging

Log format:  2025-12-01 09:00:00 | INFO     | router.orders             | Created order: PO-001
"""

import logging
import sys
from pathlib import Path

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

_console_handler = logging.StreamHandler(sys.stdout)
_console_handler.setFormatter(_formatter)

_file_handler = logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8")
_file_handler.setFormatter(_formatter)


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger with console + file handlers.
    Handlers are added only once to prevent duplicate log lines.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        logger.addHandler(_console_handler)
        logger.addHandler(_file_handler)
    return logger

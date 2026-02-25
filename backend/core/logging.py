import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

_LOG_FILE = Path(__file__).resolve().parents[1] / "logs" / "app.log"
_formatter = logging.Formatter(
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        # stdout
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(_formatter)
        logger.addHandler(stream_handler)

        # file (5 MB max, 3 backups) — disabled during tests
        if not os.getenv("TESTING"):
            _LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
            file_handler = RotatingFileHandler(_LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
            file_handler.setFormatter(_formatter)
            logger.addHandler(file_handler)

        logger.setLevel(logging.INFO)
    return logger

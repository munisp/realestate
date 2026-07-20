"""
Shared structured logger for all Python microservices.

Uses python-json-logger for JSON output in production and standard
coloured text in development.

Usage:
    from shared.logger import get_logger
    log = get_logger("fraud-detection")
    log.info("Model loaded", extra={"model_version": "v2.1", "features": 42})
    log.error("Prediction failed", extra={"error": str(e), "input_id": req_id})
"""
import logging
import os
import sys
from typing import Optional

_IS_PRODUCTION = os.getenv("NODE_ENV", "development") == "production" or \
                 os.getenv("LOG_FORMAT", "text").lower() == "json"

_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


class _DevFormatter(logging.Formatter):
    """Human-readable coloured formatter for development."""
    COLOURS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # yellow
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        colour = self.COLOURS.get(record.levelname, "")
        msg = super().format(record)
        return f"{colour}[{record.levelname}]{self.RESET} {msg}"


def get_logger(service: str, name: Optional[str] = None) -> logging.Logger:
    """
    Return a configured logger for the given service.

    Args:
        service: Service name added to every log record (e.g. "fraud-detection").
        name:    Logger name (defaults to service).
    """
    logger_name = name or service
    logger = logging.getLogger(logger_name)

    if logger.handlers:
        return logger  # Already configured

    level = getattr(logging, _LOG_LEVEL, logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    if _IS_PRODUCTION:
        try:
            from pythonjsonlogger import jsonlogger  # type: ignore
            fmt = jsonlogger.JsonFormatter(
                fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        except ImportError:
            # Fallback if python-json-logger is not installed
            fmt = logging.Formatter(
                '{"time":"%(asctime)s","level":"%(levelname)s","service":"%(name)s","message":"%(message)s"}',
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
    else:
        fmt = _DevFormatter(
            fmt=f"%(asctime)s [{service}] %(message)s",
            datefmt="%H:%M:%S",
        )

    handler.setFormatter(fmt)
    logger.addHandler(handler)
    logger.propagate = False

    # Inject service name into every record
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):  # type: ignore
        record = old_factory(*args, **kwargs)
        record.service = service
        return record

    logging.setLogRecordFactory(record_factory)

    return logger

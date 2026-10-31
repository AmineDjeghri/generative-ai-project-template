"""Settings and logging configuration for genai-template-frontend."""

from __future__ import annotations

import sys

from loguru import logger as _loguru_logger
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


class ApplicationSettings(BaseSettings):
    """Read frontend settings from the environment and optional .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    BACKEND_URL: str = "http://localhost:8000"
    BACKEND_REQUEST_TIMEOUT_SECONDS: float = Field(default=120, gt=0)
    BACKEND_CONNECT_TIMEOUT_SECONDS: float = Field(default=5, gt=0)

    logging_level: str = Field(
        default="DEBUG",
        validation_alias=AliasChoices("LOGGING_LEVEL", "logging_level"),
        description="Log level (TRACE, DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )


def _initialize_logger(settings: ApplicationSettings):
    """Initialize the loguru logger with app-specific configuration."""
    level = settings.logging_level

    try:
        _loguru_logger.remove(0)
    except ValueError:
        pass

    _loguru_logger.add(
        sys.stderr,
        level=level,
        filter=lambda record: record["extra"].get("name") == "genai-template-frontend",
    )

    return _loguru_logger.bind(name="genai-template-frontend")


settings = ApplicationSettings()
logger = _initialize_logger(settings)

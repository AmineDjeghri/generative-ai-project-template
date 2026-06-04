"""Settings and logging configuration for genai-template-frontend."""

from __future__ import annotations

import sys

from loguru import logger as _loguru_logger
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseEnvironmentSettings(BaseSettings):
    """Base settings for environment configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


class APIEnvironmentVariables(BaseEnvironmentSettings):
    """API configuration for frontend."""

    BACKEND_URL: str = "http://localhost:8000"


class ApplicationSettings(APIEnvironmentVariables):
    """Configuration for genai-template-frontend.

    Values are read from environment variables and optionally
    overridden by a ``.env`` file.
    """

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

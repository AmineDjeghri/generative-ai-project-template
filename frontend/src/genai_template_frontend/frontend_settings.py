"""Settings and logging configuration for genai-template-frontend."""

from __future__ import annotations

import sys
from typing import Optional

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


# Cached singleton
_cached_settings: Optional[ApplicationSettings] = None


def get_cached_settings() -> ApplicationSettings:
    """Return the cached settings.

    On the first call the settings are loaded from env / .env.
    Subsequent calls return the same instance.
    """
    global _cached_settings
    if _cached_settings is None:
        _cached_settings = ApplicationSettings()
    return _cached_settings


_logger_initialized: bool = False


def get_logger():
    """Return a loguru logger bound to the app namespace.

    Log level is controlled by LOGGING_LEVEL setting.
    """
    global _logger_initialized
    if not _logger_initialized:
        _cfg = get_cached_settings()
        level = _cfg.logging_level

        # Remove the default loguru sink (ID 0) to prevent a duplicate when we add our logger.
        try:
            _loguru_logger.remove(0)
        except ValueError:
            pass  # already removed

        _loguru_logger.add(
            sys.stderr,
            level=level,
            filter=lambda record: record["extra"].get("name") == "genai-template-frontend",
        )

        _logger_initialized = True

    return _loguru_logger.bind(name="genai-template-frontend")


# Instantiate at module level for optimization
settings = get_cached_settings()
logger = get_logger()

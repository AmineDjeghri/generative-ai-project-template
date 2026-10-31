"""Settings and logging configuration for genai-template-backend."""

import sys

from loguru import logger as _loguru_logger
from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ApplicationSettings(BaseSettings):
    """Read application settings from the environment and optional .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    INFERENCE_BASE_URL: str
    INFERENCE_API_KEY: SecretStr
    INFERENCE_DEPLOYMENT_NAME: str
    INFERENCE_API_VERSION: str = "2025-02-01-preview"
    EMBEDDINGS_BASE_URL: str | None = None
    EMBEDDINGS_API_KEY: SecretStr | None = None
    EMBEDDINGS_DEPLOYMENT_NAME: str | None = None
    EMBEDDINGS_API_VERSION: str = "2025-02-01-preview"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = Field(default=8000, ge=1, le=65535)
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
        filter=lambda record: record["extra"].get("name") == "genai-template-backend",
    )

    return _loguru_logger.bind(name="genai-template-backend")


settings = ApplicationSettings()
logger = _initialize_logger(settings)

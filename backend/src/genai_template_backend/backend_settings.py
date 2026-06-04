"""Settings and logging configuration for genai-template-backend."""

from __future__ import annotations

import ast
import sys
import timeit
from typing import Optional

import litellm
from loguru import logger as _loguru_logger
from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseEnvironmentSettings(BaseSettings):
    """Base settings for environment configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


class InferenceEnvironmentVariables(BaseEnvironmentSettings):
    INFERENCE_BASE_URL: str
    INFERENCE_API_KEY: SecretStr
    INFERENCE_DEPLOYMENT_NAME: str
    INFERENCE_API_VERSION: str = "2025-02-01-preview"


class EmbeddingsEnvironmentVariables(BaseEnvironmentSettings):
    EMBEDDINGS_BASE_URL: Optional[str] = None
    EMBEDDINGS_API_KEY: Optional[SecretStr] = "tt"
    EMBEDDINGS_DEPLOYMENT_NAME: Optional[str] = None
    EMBEDDINGS_API_VERSION: str = "2025-02-01-preview"


class APIEnvironmentVariables(BaseEnvironmentSettings):
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: str = "8000"


class ApplicationSettings(
    InferenceEnvironmentVariables,
    EmbeddingsEnvironmentVariables,
    APIEnvironmentVariables,
):
    """Configuration for genai-template-backend.

    Values are read from environment variables and optionally
    overridden by a ``.env`` file.
    """

    logging_level: str = Field(
        default="DEBUG",
        validation_alias=AliasChoices("LOGGING_LEVEL", "logging_level"),
        description="Log level (TRACE, DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )

    def model_post_init(self, __context):
        """Called after model initialization."""
        litellm.suppress_debug_info = True


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


def safe_eval(x):
    try:
        return ast.literal_eval(x)
    except:
        return []


def time_function(func):
    def wrapper(*args, **kwargs):
        start_time = timeit.default_timer()
        result = func(*args, **kwargs)

        end_time = timeit.default_timer()
        execution_time = round(end_time - start_time, 2)
        if result:
            if "reason" in result:
                result["reason"] = f" Execution time: {execution_time}s | " + result["reason"]

            if "output" in result:
                result["output"] = f" Execution time: {execution_time}s | " + result["output"]
            logger.debug(f"Function {func.__name__} took {execution_time} seconds to execute.")

        return result

    return wrapper


settings = ApplicationSettings()
logger = _initialize_logger(settings)

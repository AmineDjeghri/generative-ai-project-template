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


_cached_settings: Optional[ApplicationSettings] = None


def get_cached_settings() -> ApplicationSettings:
    """Return the cached settings.

    On the first call the settings are loaded from env / .env.
    Subsequent calls return the same instance.
    """
    global _cached_settings
    if _cached_settings is None:
        _cached_settings = ApplicationSettings()
        litellm.suppress_debug_info = True
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

        try:
            _loguru_logger.remove(0)
        except ValueError:
            pass

        _loguru_logger.add(
            sys.stderr,
            level=level,
            filter=lambda record: record["extra"].get("name") == "genai-template-backend",
        )

        _logger_initialized = True

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


# Instantiate at module level for optimization
settings = get_cached_settings()
logger = get_logger()

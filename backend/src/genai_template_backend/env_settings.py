import ast
import sys
import timeit

from typing import Optional

import litellm
from loguru import logger as loguru_logger
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseEnvironmentVariables(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


class InferenceEnvironmentVariables(BaseEnvironmentVariables):
    INFERENCE_BASE_URL: str
    INFERENCE_API_KEY: SecretStr
    INFERENCE_DEPLOYMENT_NAME: str
    INFERENCE_API_VERSION: str = "2025-02-01-preview"


class EmbeddingsEnvironmentVariables(BaseEnvironmentVariables):
    EMBEDDINGS_BASE_URL: Optional[str] = None
    EMBEDDINGS_API_KEY: Optional[SecretStr] = "tt"
    EMBEDDINGS_DEPLOYMENT_NAME: Optional[str] = None
    EMBEDDINGS_API_VERSION: str = "2025-02-01-preview"


class APIEnvironmentVariables(BaseEnvironmentVariables):
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: str = "8000"


class Settings(
    InferenceEnvironmentVariables,
    EmbeddingsEnvironmentVariables,
    APIEnvironmentVariables,
):
    """Settings class for the application.

    This class is automatically initialized with environment variables from the .env file.


    """

    DEV_MODE: bool = True


def initialize():
    """Initialize the settings, logger, and search client.

    Reads the environment variables from the .env file defined in the Settings class.

    Returns:
        settings
        loguru_logger
        search_client
    """
    settings = Settings()
    loguru_logger.remove()

    litellm.suppress_debug_info = True

    if settings.DEV_MODE:
        loguru_logger.add(sys.stderr, level="TRACE")
    else:
        loguru_logger.add(sys.stderr, level="INFO")

    return settings, loguru_logger


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


settings, logger = initialize()

"""Utility functions for the JYM application."""

import os
import pathlib
from nicegui import app
import sys
import timeit
from loguru import logger as loguru_logger
from pydantic_settings import BaseSettings, SettingsConfigDict


def setup_static_resources():
    """Set up static resources for the application."""
    # Get the project root directory (where the app is run from)
    project_root = pathlib.Path.cwd()
    resources_path = os.path.join(project_root, "resources")
    images_path = os.path.join(resources_path, "images")

    # Add static files directory for images
    app.add_static_files("/static", images_path)

    # Add media files directory for videos (using the same images directory since videos are there)
    app.add_media_files("/media", images_path)


class BaseEnvironmentVariables(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


class APIEnvironmentVariables(BaseEnvironmentVariables):
    BACKEND_URL: str = "http://localhost:8000"


class Settings(
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

    if settings.DEV_MODE:
        loguru_logger.add(sys.stderr, level="TRACE")
    else:
        loguru_logger.add(sys.stderr, level="INFO")

    return settings, loguru_logger


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

import os
import sys

import litellm
from loguru import logger as loguru_logger

from tryon_api.env_settings import Settings


def initialize() -> tuple[Settings, loguru_logger]:
    """Initialize the settings, logger, and search client.

    Reads the environment variables from the .env file defined in the Settings class.

    Returns:
        settings
        loguru_logger
    """
    loguru_logger.info("Initializing settings and logger...")
    loguru_logger.debug(f"Current working directory: {os.getcwd()}")
    settings = Settings()
    loguru_logger.remove()

    litellm.suppress_debug_info = True

    if settings.DEV_MODE:
        loguru_logger.add(sys.stderr, level="TRACE")
    else:
        loguru_logger.add(sys.stderr, level="INFO")

    return settings, loguru_logger


settings, logger = initialize()

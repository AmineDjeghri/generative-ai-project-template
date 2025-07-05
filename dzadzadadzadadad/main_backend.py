import uvicorn

from api.log_config import LOGGING_CONFIG
from utils import logger, settings

if __name__ == "__main__":
    if settings.DEV_MODE:
        logger.info("Running app in DEV mode")
        reload = True
        LOGGING_CONFIG["loggers"]["uvicorn"]["level"] = "DEBUG"
        LOGGING_CONFIG["loggers"]["uvicorn.error"]["level"] = "DEBUG"
        LOGGING_CONFIG["loggers"]["uvicorn.access"]["level"] = "DEBUG"
    else:
        logger.info("Running app in PROD mode")
        reload = False
    uvicorn.run(
        app="api.api:app",
        host=settings.FASTAPI_HOST,
        port=settings.FASTAPI_PORT,
        reload=reload,
        log_config=LOGGING_CONFIG,
    )

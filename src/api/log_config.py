from typing import Any

# This file is used to configure the logging for the application (check the main of api_server.py)
# It is used with the uvicorn/fastapi function to configure the logging
# There is an environment variable named DEV_MODE that is used to configure the logging level


LOGGING_CONFIG: dict[str, Any] = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": "%(asctime)s - %(name)s - %(levelprefix)s - [%(filename)s:%(funcName)s:%(lineno)d] - %(message)s",
            "use_colors": None,
        },
        "access": {
            "()": "uvicorn.logging.AccessFormatter",
            "fmt": '%(asctime)s - %(name)s - %(levelprefix)s - %(client_addr)s - "%(request_line)s" %(status_code)s',  # noqa: E501
        },
        "access_file": {
            "()": "uvicorn.logging.AccessFormatter",
            "fmt": '%(asctime)s - %(name)s - %(levelprefix)s - %(client_addr)s - "%(request_line)s" %(status_code)s',  # noqa: E501
            "use_colors": False,
        },
    },
    "handlers": {
        "file_handler": {
            "formatter": "access_file",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "./app.log",
            "mode": "a+",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 0,
        },
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
        "access": {
            "formatter": "access",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        "uvicorn": {"handlers": ["default"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"level": "INFO"},
        "uvicorn.access": {
            "handlers": ["access", "file_handler"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

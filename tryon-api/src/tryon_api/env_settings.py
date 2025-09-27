from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseEnvironmentVariables(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


class APIEnvironmentVariables(BaseEnvironmentVariables):
    # Support both BACKEND_* and FASTAPI_* env names for host/port
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8001

    # NiceGUI UI configuration
    UI_HOST: str = "127.0.0.1"
    UI_PORT: int = 8080

    # ComfyUI configuration
    QWEN_ENABLED: bool = True
    COMFYUI_SERVER_URL: str = "http://172.21.160.1:8000"

    # FASHN API configuration
    FASHN_API_KEY: Optional[str] = None
    FASHN_MODEL_NAME: str = "tryon-v1.6"
    FASHN_BASE_URL: str = "https://api.fashn.ai/v1"
    FASHN_POLL_INTERVAL: float = 2.0
    FASHN_TIMEOUT_SECONDS: int = 180


class Settings(
    APIEnvironmentVariables,
):
    """Settings class for the application.

    This class is automatically initialized with environment variables from the .env file.


    """

    DEV_MODE: bool = True

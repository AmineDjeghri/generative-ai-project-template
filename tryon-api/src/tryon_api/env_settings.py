from typing import Optional

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

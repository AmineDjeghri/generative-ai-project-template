from typing import Optional, Self

from loguru import logger as loguru_logger
from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from rich.pretty import pretty_repr


class BaseEnvironmentVariables(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


class InferenceEnvironmentVariables(BaseEnvironmentVariables):
    INFERENCE_BASE_URL: Optional[str] = "http://localhost:11434"
    INFERENCE_API_KEY: Optional[SecretStr] = "tt"
    INFERENCE_DEPLOYMENT_NAME: Optional[str] = "ollama_chat/qwen2.5:0.5b"
    INFERENCE_API_VERSION: str = "2025-02-01-preview"

    def get_inference_env_vars(self):
        return {
            "INFERENCE_BASE_URL": self.INFERENCE_BASE_URL,
            "INFERENCE_API_KEY": self.INFERENCE_API_KEY,
            "INFERENCE_DEPLOYMENT_NAME": self.INFERENCE_DEPLOYMENT_NAME,
            "INFERENCE_API_VERSION": self.INFERENCE_API_VERSION,
        }


class EmbeddingsEnvironmentVariables(BaseEnvironmentVariables):
    EMBEDDINGS_BASE_URL: Optional[str] = None
    EMBEDDINGS_API_KEY: Optional[SecretStr] = "tt"
    EMBEDDINGS_DEPLOYMENT_NAME: Optional[str] = None
    EMBEDDINGS_API_VERSION: str = "2025-02-01-preview"

    def get_embeddings_env_vars(self):
        return {
            "EMBEDDINGS_BASE_URL": self.EMBEDDINGS_BASE_URL,
            "EMBEDDINGS_API_KEY": self.EMBEDDINGS_API_KEY,
            "EMBEDDINGS_DEPLOYMENT_NAME": self.EMBEDDINGS_DEPLOYMENT_NAME,
        }


class EvaluatorEnvironmentVariables(BaseEnvironmentVariables):
    EVALUATOR_BASE_URL: Optional[str] = "http://localhost:11434"
    EVALUATOR_API_KEY: Optional[SecretStr] = "tt"
    EVALUATOR_DEPLOYMENT_NAME: Optional[str] = "ollama_chat/qwen2.5:0.5b"
    EVALUATOR_API_VERSION: str = "2024-10-01-preview"

    ENABLE_EVALUATION: bool = False

    def get_evaluator_env_vars(self):
        return {
            "EVALUATOR_BASE_URL": self.EVALUATOR_BASE_URL,
            "EVALUATOR_API_KEY": self.EVALUATOR_API_KEY,
            "EVALUATOR_DEPLOYMENT_NAME": self.EVALUATOR_DEPLOYMENT_NAME,
        }

    @model_validator(mode="after")
    def check_eval_api_keys(self: Self) -> Self:
        """Validate API keys based on the selected provider after model initialization."""
        if self.ENABLE_EVALUATION:
            eval_vars = self.get_evaluator_env_vars()
            if any(value is None for value in eval_vars.values()):
                # loguru_logger.opt(exception=True).error("Your error message")
                loguru_logger.error(
                    "\nEVALUATION environment variables must be provided when ENABLE_EVALUATION is True."
                    f"\n{pretty_repr(eval_vars)}"
                )
                raise ValueError(
                    "\nEVALUATION environment variables must be provided when ENABLE_EVALUATION is True."
                    f"\n{pretty_repr(eval_vars)}"
                )

        return self


class AzureAISearchEnvironmentVariables(BaseEnvironmentVariables):
    """Represents environment variables for configuring Azure AI Search and Azure Storage."""

    ################ Azure Search settings ################
    ENABLE_AZURE_SEARCH: bool = False
    AZURE_SEARCH_SERVICE_ENDPOINT: Optional[str] = None
    AZURE_SEARCH_INDEX_NAME: Optional[str] = None
    AZURE_SEARCH_INDEXER_NAME: Optional[str] = None
    AZURE_SEARCH_API_KEY: Optional[str] = None
    AZURE_SEARCH_TOP_K: Optional[str] = "2"
    SEMENTIC_CONFIGURATION_NAME: Optional[str] = None
    # Azure Storage settings
    AZURE_STORAGE_ACCOUNT_NAME: Optional[str] = None
    AZURE_STORAGE_ACCOUNT_KEY: Optional[str] = None
    AZURE_CONTAINER_NAME: Optional[str] = None

    def get_azure_search_env_vars(self):
        items_dict = {
            "ENABLE_AZURE_SEARCH": self.ENABLE_AZURE_SEARCH,
            "SEMENTIC_CONFIGURATION_NAME": self.SEMENTIC_CONFIGURATION_NAME,
            "AZURE_STORAGE_ACCOUNT_NAME": self.AZURE_STORAGE_ACCOUNT_NAME,
            "AZURE_STORAGE_ACCOUNT_KEY": self.AZURE_STORAGE_ACCOUNT_KEY,
            "AZURE_CONTAINER_NAME": self.AZURE_CONTAINER_NAME,
        }

        items_dict.update(
            {key: value for key, value in vars(self).items() if key.startswith("AZURE_SEARCH")}
        )
        return items_dict

    @model_validator(mode="after")
    def check_ai_search_keys(self: Self) -> Self:
        """Validate API keys based on the selected provider after model initialization."""
        if self.ENABLE_AZURE_SEARCH:
            azure_search_vars = self.get_azure_search_env_vars()
            if any(value is None for value in azure_search_vars.values()):
                loguru_logger.error(
                    "\nAZURE_SEARCH environment variables must be provided when ENABLE_AZURE_SEARCH is True."
                    f"\n{pretty_repr(azure_search_vars)}"
                )
                raise ValueError(
                    "\nAZURE_SEARCH environment variables must be provided when ENABLE_AZURE_SEARCH is True."
                    f"\n{pretty_repr(azure_search_vars)}"
                )
        return self


class Settings(
    InferenceEnvironmentVariables,
    EmbeddingsEnvironmentVariables,
    EvaluatorEnvironmentVariables,
    AzureAISearchEnvironmentVariables,
):
    """Settings class for the application.

    This class is automatically initialized with environment variables from the .env file.
    It inherits from the following classes and contains additional settings for streamlit and fastapi
    - ChatEnvironmentVariables
    - AzureAISearchEnvironmentVariables
    - EvaluationEnvironmentVariables

    """

    FASTAPI_HOST: str = "localhost"
    FASTAPI_PORT: int = 8080
    STREAMLIT_PORT: int = 8501
    DEV_MODE: bool = True

    def get_active_env_vars(self):
        env_vars = {
            "DEV_MODE": self.DEV_MODE,
            "FASTAPI_PORT": self.FASTAPI_PORT,
            "STREAMLIT_PORT": self.STREAMLIT_PORT,
        }

        env_vars.update(self.get_inference_env_vars())
        env_vars.update(self.get_embeddings_env_vars())
        if self.ENABLE_AZURE_SEARCH:
            env_vars.update(self.get_azure_search_env_vars())

        if self.ENABLE_EVALUATION:
            env_vars.update(self.get_evaluator_env_vars())

        return env_vars

from enum import Enum
from typing import Optional, Self
from rich.pretty import pretty_repr

from loguru import logger as loguru_logger
from pydantic import SecretStr, model_validator

from pydantic_settings import BaseSettings, SettingsConfigDict


class ProviderEnum(str, Enum):
    openai = "openai"
    azure_openai = "azure_openai"


class BaseEnvironmentVariables(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


class OpenAIChatEnvironmentVariables(BaseEnvironmentVariables):
    OPENAI_BASE_URL: Optional[str] = "https://api.openai.com/v1"
    OPENAI_API_KEY: Optional[SecretStr] = None
    OPENAI_DEPLOYMENT_NAME: Optional[str] = None

    def get_openai_env_vars(self):
        return {key: value for key, value in vars(self).items() if key.startswith("OPENAI_")}


class AzureOpenAIChatEnvironmentVariables(BaseEnvironmentVariables):
    AZURE_OPENAI_DEPLOYMENT_NAME: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[SecretStr] = None
    AZURE_OPENAI_BASE_URL: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-10-01-preview"

    def get_azure_openai_env_vars(self):
        return {key: value for key, value in vars(self).items() if key.startswith("AZURE_OPENAI")}


class ChatEnvironmentVariables(OpenAIChatEnvironmentVariables, AzureOpenAIChatEnvironmentVariables):
    """Represents environment variables for configuring the chatbot and promptfoo providers."""

    LLM_PROVIDER: ProviderEnum  # openai or azure_openai
    # if you want to emulate azure_openai or openai using ollama or ollamazure
    OLLAMA_MODEL_NAME: Optional[str] = None  # "phi3:3.8b-mini-4k-instruct-q4_K_M"
    OLLAMA_EMBEDDING_MODEL_NAME: Optional[str] = None  # "all-minilm:l6-v2"

    @model_validator(mode="after")
    def check_chat_api_keys(self: Self) -> Self:
        """Validate API keys based on the selected provider after model initialization."""
        if self.LLM_PROVIDER == ProviderEnum.openai:
            openai_vars = self.get_openai_env_vars()
            openai_vars["LLM_PROVIDER"] = self.LLM_PROVIDER
            if any(value is None for value in openai_vars.values()):
                loguru_logger.error(
                    "\nOPENAI environment variables must be provided when LLM_PROVIDER is 'openai'."
                    f"\n{pretty_repr(openai_vars)}"
                )
                raise ValueError(
                    "\nOPENAI environment variables must be provided when LLM_PROVIDER is 'openai'."
                    f"\n{pretty_repr(openai_vars)}"
                )

        elif self.LLM_PROVIDER == ProviderEnum.azure_openai:
            azure_openai_vars = self.get_azure_openai_env_vars()
            azure_openai_vars["LLM_PROVIDER"] = self.LLM_PROVIDER
            if any(value is None for value in azure_openai_vars.values()):
                loguru_logger.error(
                    "\nAZURE_OPENAI environment variables must be provided when LLM_PROVIDER is 'azure_openai'."
                    f"\n{pretty_repr(azure_openai_vars)}"
                )
                raise ValueError(
                    "\nAZURE_OPENAI environment variables must be provided when LLM_PROVIDER is 'azure_openai'."
                    f"\n{pretty_repr(azure_openai_vars)}"
                )

        else:
            raise ValueError(f"Unknown LLM_PROVIDER: {self.LLM_PROVIDER}")

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


class EvaluationEnvironmentVariables(BaseEnvironmentVariables):
    """Represents environment variables for configuring Promptfoo and ragas.

    Ragas uses LLM as a judge for its metrics.

    """

    ENABLE_EVALUATION: bool = False
    # LLM as a Judge for RAGAS metrics
    LLMAAJ_PROVIDER: Optional[ProviderEnum] = None  # openai or azure_openai

    # if judge provider is openai
    LLMAAJ_OPENAI_DEPLOYMENT_NAME: Optional[str] = None
    LLMAAJ_OPENAI_API_KEY: Optional[SecretStr] = None
    LLMAAJ_OPENAI_BASE_URL: Optional[str] = None
    LLMAAJ_OPENAI_EMBEDDING_DEPLOYMENT_NAME: Optional[str] = None

    # if judge provider is azure_openai
    LLMAAJ_AZURE_OPENAI_DEPLOYMENT_NAME: str = "phi3:3.8b-mini-4k-instruct-q4_K_M"
    LLMAAJ_AZURE_OPENAI_API_KEY: SecretStr = "1234"
    LLMAAJ_AZURE_OPENAI_BASE_URL: str = "http://localhost:4041"
    LLMAAJ_AZURE_OPENAI_API_VERSION: str = "2024-10-01-preview"
    LLMAAJ_AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: Optional[str] = "all-minilm:l6-v2"

    def get_eval_env_vars(self):
        items_dict = {
            "ENABLE_EVALUATION": self.ENABLE_EVALUATION,
            "LLMAAJ_PROVIDER": self.LLMAAJ_PROVIDER,
        }
        if self.LLMAAJ_PROVIDER == ProviderEnum.openai:
            items_dict.update(
                {key: value for key, value in vars(self).items() if key.startswith("LLMAAJ_OPENAI")}
            )
        elif self.LLMAAJ_PROVIDER == ProviderEnum.azure_openai:
            items_dict.update(
                {
                    key: value
                    for key, value in vars(self).items()
                    if key.startswith("LLMAAJ_AZURE_OPENAI")
                }
            )
        else:
            raise ValueError(f"Unknown LLMAAJ_PROVIDER: {self.LLMAAJ_PROVIDER}")
        return items_dict

    @model_validator(mode="after")
    def check_eval_api_keys(self: Self) -> Self:
        """Validate API keys based on the selected provider after model initialization."""
        if self.ENABLE_EVALUATION:
            if not self.LLMAAJ_PROVIDER in [ProviderEnum.openai, ProviderEnum.azure_openai]:
                loguru_logger.error(
                    f"Unsupported env variable LLMAAJ_PROVIDER with value: {self.LLMAAJ_PROVIDER}"
                )
                raise ValueError(
                    f"Unsupported variable LLMAAJ_PROVIDER with value: {self.LLMAAJ_PROVIDER}"
                )
            eval_vars = self.get_eval_env_vars()
            if any(value is None for value in eval_vars.values()):
                loguru_logger.error(
                    "\nEVALUATION environment variables must be provided when ENABLE_EVALUATION is True."
                    f"\n{pretty_repr(eval_vars)}"
                )
                raise ValueError(
                    "\nEVALUATION environment variables must be provided when ENABLE_EVALUATION is True."
                    f"\n{pretty_repr(eval_vars)}"
                )

        return self


class Settings(
    ChatEnvironmentVariables, AzureAISearchEnvironmentVariables, EvaluationEnvironmentVariables
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

        if self.LLM_PROVIDER == ProviderEnum.openai:
            env_vars.update(self.get_openai_env_vars())
        elif self.LLM_PROVIDER == ProviderEnum.azure_openai:
            env_vars.update(self.get_azure_openai_env_vars())
        else:
            raise ValueError(f"Unknown LLM_PROVIDER: {self.LLM_PROVIDER}")

        if self.ENABLE_AZURE_SEARCH:
            env_vars.update(self.get_azure_search_env_vars())

        if self.ENABLE_EVALUATION:
            env_vars.update(self.get_eval_env_vars())

        return env_vars

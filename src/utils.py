import ast
import os
import sys
import timeit
from pathlib import Path
import litellm
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from loguru import logger as loguru_logger
from pydantic import ValidationError
from rich.pretty import pretty_repr

from settings import Settings

# Check if we run the code from the src directory
if Path("src").is_dir():
    loguru_logger.warning("Changing working directory to src")
    loguru_logger.warning(f" Current working dir is {Path.cwd()}")
    os.chdir("src")
elif Path("ml").is_dir():
    # loguru_logger.warning(f" Current working dir is {Path.cwd()}")
    pass
else:
    raise Exception(
        f"Project should always run from the src directory. But current working dir is {Path.cwd()}"
    )


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

    search_client = None
    if settings.ENABLE_AZURE_SEARCH:
        search_client = SearchClient(
            settings.AZURE_SEARCH_SERVICE_ENDPOINT,
            settings.AZURE_SEARCH_INDEX_NAME,
            AzureKeyCredential(settings.AZURE_SEARCH_API_KEY),
        )

    return settings, loguru_logger, search_client


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
        if "reason" in result:
            result["reason"] = f" Execution time: {execution_time}s | " + result["reason"]

        if "output" in result:
            result["output"] = f" Execution time: {execution_time}s | " + result["output"]
        logger.debug(f"Function {func.__name__} took {execution_time} seconds to execute.")

        return result

    return wrapper


def validation_error_message(error: ValidationError) -> ValidationError:
    for err in error.errors():
        del err["input"]
        del err["url"]

    return error


def check_inference_llm():
    """Check the LLM client by sending a message to the model."""
    try:
        chat_completion = litellm.completion(
            model=settings.INFERENCE_DEPLOYMENT_NAME,
            api_key=settings.INFERENCE_API_KEY.get_secret_value(),
            base_url=settings.INFERENCE_BASE_URL,
            api_version=settings.INFERENCE_API_VERSION,
            messages=[
                {
                    "role": "user",
                    "content": "Hi",
                }
            ],
        )
        logger.info(chat_completion)

        logger.info(
            f"\nActive environment variables are: \n{pretty_repr(settings.get_active_env_vars())}\n"
            f"\nmodel response: {chat_completion.choices[0].message.content}"
        )
    except Exception as e:
        logger.error(
            f"Error, active environment variables are: {pretty_repr(settings.get_active_env_vars())}"
        )
        raise e


def check_evaluator_llm():
    """Check the LLM client by sending a message to the model.

    Uses OpenAI/AzureOpenAI as the LLM client
    """
    try:
        if settings.ENABLE_EVALUATION:
            chat_completion = litellm.completion(
                model=settings.EVALUATOR_DEPLOYMENT_NAME,
                api_key=settings.EVALUATOR_API_KEY.get_secret_value(),
                base_url=settings.EVALUATOR_BASE_URL,
                api_version=settings.EVALUATOR_API_VERSION,
                messages=[
                    {
                        "role": "user",
                        "content": "Hi",
                    }
                ],
            )
            logger.info(chat_completion)

            logger.info(
                f"\nActive environment variables are: \n{pretty_repr(settings.get_active_env_vars())}\n"
                f"\nmodel response: {chat_completion.choices[0].message.content}"
            )
        else:
            logger.warning(
                f"Enable evaluation is off. Activate it to use the evaluator."
                f"\nActive environment variables are: \n{pretty_repr(settings.get_active_env_vars())}\n"
            )
    except Exception as e:
        logger.error(
            f"Error, active environment variables are: {pretty_repr(settings.get_active_env_vars())}"
        )
        raise e


settings, logger, search_client = initialize()

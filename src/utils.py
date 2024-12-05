import ast
import os
import sys
import timeit
from pathlib import Path

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings, OpenAIEmbeddings, ChatOpenAI
from loguru import logger as loguru_logger
from pydantic import ValidationError
from rich.pretty import pretty_repr

from settings import Settings, ProviderEnum

# Check if we run the code from the src directory
if Path("src").is_dir():
    loguru_logger.warning("Changing working directory to src")
    loguru_logger.warning(f" Current working dir is {Path.cwd()}")
    os.chdir("src")
elif Path("ml").is_dir():
    # loguru_logger.warning(f" Current working dir is {Path.cwd()}")
    pass
else:
    raise Exception("Project should always run from the src directory.")


# we will use the name llmaaj instead of llm_as_a_judge


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


def get_llm_client() -> tuple[object, str]:
    """Initializes and returns a language model client based on the configured provider.

    Depending on the value of `settings.LLM_PROVIDER`, this function will initialize
    either an OpenAI or AzureOpenAI client from OpenAI library. It loads the client with the appropriate
    settings and logs the model being used.

    Returns:
        tuple: A tuple containing the initialized client and the model name.

    Raises:
        ValueError: If the configured LLM provider is unsupported.
    """
    if settings.LLM_PROVIDER == ProviderEnum.openai:
        from openai import OpenAI

        client = OpenAI(
            base_url=settings.OPENAI_BASE_URL,
            api_key=settings.OPENAI_API_KEY.get_secret_value(),
        )
        model_name = settings.OPENAI_DEPLOYMENT_NAME
        loguru_logger.info(f"Loaded OpenAI client with model: {model_name}")

    elif settings.LLM_PROVIDER == ProviderEnum.azure_openai:
        from openai import AzureOpenAI

        client = AzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY.get_secret_value(),
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_BASE_URL,
        )
        model_name = settings.AZURE_OPENAI_DEPLOYMENT_NAME
        loguru_logger.info(f"Loaded AzureOpenAI client with model: {model_name}")

    else:
        raise ValueError(f"Unsupported LLM provider: {settings.LLM_PROVIDER}")

    return client, model_name


def get_llm_as_a_judge_client():
    """Initializes and returns a LLM as a judge client based on the configured provider.

    Depending on the value of `settings.LLMAAJ_PROVIDER`, this function will initialize
    either an OpenAI or AzureOpenAI client and embedding client from Langchain OpenAI library. It loads the client with
    the appropriate settings and logs the model being used.

    If `settings.ENABLE_EVALUATION` is False, the function will return `(None, None)` and log a warning.

    Returns:
        tuple: A tuple containing
            - the initialized client and the embedding client (AzureOpenAI and AzureOpenAIEmbeddings or OpenAI and
            OpenAIEmbeddings)
            - or `(None, None)` if evaluation is disabled.

    Raises:
        ValueError: If the configured LLM provider is unsupported.
    """
    if settings.ENABLE_EVALUATION:
        if settings.LLMAAJ_PROVIDER == ProviderEnum.azure_openai:
            client = AzureChatOpenAI(
                azure_endpoint=settings.LLMAAJ_AZURE_OPENAI_BASE_URL,
                deployment_name=settings.LLMAAJ_AZURE_OPENAI_DEPLOYMENT_NAME,
                openai_api_key=settings.LLMAAJ_AZURE_OPENAI_API_KEY,
                openai_api_version=settings.LLMAAJ_AZURE_OPENAI_API_VERSION,
            )
            embeddings_client = AzureOpenAIEmbeddings(
                azure_endpoint=settings.LLMAAJ_AZURE_OPENAI_BASE_URL,
                model=settings.LLMAAJ_AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
                openai_api_key=settings.LLMAAJ_AZURE_OPENAI_API_KEY,
                openai_api_version=settings.LLMAAJ_AZURE_OPENAI_API_VERSION,
            )
            loguru_logger.info(
                f"Loaded LLMAAJ AzureOpenAI client with model: {settings.LLMAAJ_OPENAI_DEPLOYMENT_NAME}"
            )
        elif settings.LLMAAJ_PROVIDER == ProviderEnum.openai:
            client = ChatOpenAI(
                model_name=settings.LLMAAJ_OPENAI_DEPLOYMENT_NAME,
                openai_api_base=settings.LLMAAJ_OPENAI_BASE_URL,
                openai_api_key=settings.LLMAAJ_OPENAI_API_KEY,
            )
            embeddings_client = OpenAIEmbeddings(
                model=settings.LLMAAJ_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
                openai_api_base=settings.LLMAAJ_OPENAI_BASE_URL,
                openai_api_key=settings.LLMAAJ_OPENAI_API_KEY,
            )
            loguru_logger.info(
                f"Loaded LLMAAJ OpenAI client with model: {settings.LLMAAJ_OPENAI_DEPLOYMENT_NAME}"
            )

        else:
            raise ValueError(f"Unsupported LLM provider: {settings.LLMAAJ_PROVIDER}")

        return (
            client,
            embeddings_client,
        )
    else:
        loguru_logger.warning(
            "Evaluation is disabled. Set ENABLE_EVALUATION to True to activate it."
        )
        return None, None


def check_llm_client():
    """Check the LLM client by sending a message to the model.

    Uses OpenAI/AzureOpenAI as the LLM client
    """
    client, model_name = get_llm_client()
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": "Hi",
                }
            ],
            model=model_name,
        )
        logger.info(chat_completion)

        logger.info(
            f"\nActive environment variables are: \n{pretty_repr(settings.get_active_env_vars())}\n"
            f"\nmodel response: {chat_completion.choices[0].message.content}"
        )
    except Exception as e:
        logger.error(
            f"Error in check_llm_client:"
            f"\nActive environment variables are: {pretty_repr(settings.get_active_env_vars())}"
        )
        raise e


def check_llm_as_a_judge_client():
    """Check the LLM as a judge client by sending a message to the model.

    Uses Langchain OpenAIChat ou Langchain AzureChatas the LLM client
    """
    try:
        llmaaj_chat_client, llmaaj_client_embedding = get_llm_as_a_judge_client()

        messages = [
            (
                "system",
                "You are a helpful assistant that translates English to French. Translate the user sentence.",
            ),
            ("human", "I love programming."),
        ]
        ai_msg = llmaaj_chat_client.invoke(messages)
        logger.info(
            f"\nEvaluation environment variables are: \n{pretty_repr(settings.get_eval_env_vars())}\n"
            f"\nmodel response: {ai_msg.content}"
        )

    except Exception as e:
        logger.error(
            f"Error in check_llm_as_a_judge_client:"
            f"\nevaluation environment variables are: {pretty_repr(settings.get_eval_env_vars())}"
        )
        raise e


settings, logger, search_client = initialize()
chat_client, chat_model_name = get_llm_client()
# LLMAAJ stands for LLM as a judge
llmaaj_chat_client, llmaaj_embedding_client = get_llm_as_a_judge_client()

if __name__ == "__main__":
    check_llm_client()
    # check_llm_as_a_judge_client()

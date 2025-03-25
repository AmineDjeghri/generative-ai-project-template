import ollama
import requests
from rich.pretty import pretty_repr

from ml.llm import InferenceLLMConfig
from utils import settings, logger

OLLAMA_MODEL_NAME = "qwen2.5:0.5b"
OLLAMA_BASE_URL = "http://localhost:11434"


def test_ping_ollama():
    response = requests.get(f"{OLLAMA_BASE_URL}")
    assert response.status_code == 200


def test_download_model():
    ollama.pull(OLLAMA_MODEL_NAME)
    models = [model for model in ollama.list()][0][1]
    models_names = [model.model for model in models]
    logger.debug(f" list models: {models_names}")
    assert OLLAMA_MODEL_NAME in models_names
    # ollama.delete(OLLAMA_MODEL_NAME)


def test_ollama_run():
    ollama.show(OLLAMA_MODEL_NAME)


def test_ollama_chat():
    res = ollama.chat(model=OLLAMA_MODEL_NAME, messages=[{"role": "user", "content": "Hi"}])
    assert type(res.message.content) == str


def test_inference_llm():
    """Test the LLM client used to generate answers."""
    llm = InferenceLLMConfig(
        model_name=settings.INFERENCE_DEPLOYMENT_NAME,
        api_key=settings.INFERENCE_API_KEY,
        base_url=settings.INFERENCE_BASE_URL,
        api_version=settings.INFERENCE_API_VERSION,
    )
    logger.info(f" Inference LLM Config is: {llm}")
    res = llm.generate("Hi")
    logger.info(
        f"\nActive environment variables are: \n{pretty_repr(settings.get_active_env_vars())}\n"
        f"\nmodel response: {res}"
    )
    assert type(res) == str


# @pytest.mark.skipif(not settings.ENABLE_EVALUATION, reason="requires env ENABLE_EVALUATION=True")
# def test_evaluator_llm():
#     """Test the LLM as a judge client used in the evaluation."""
#     check_evaluator_llm()

import ollama
import pytest
import requests

from utils import settings, logger, check_inference_llm, check_evaluator_llm

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
    check_inference_llm()


@pytest.mark.skipif(not settings.ENABLE_EVALUATION, reason="requires env ENABLE_EVALUATION=True")
def test_evaluator_llm():
    """Test the LLM as a judge client used in the evaluation."""
    check_evaluator_llm()

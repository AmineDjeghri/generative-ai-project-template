import ollama
import requests
import pytest

from genai_template_backend.env_settings import settings, logger

should_run_ollama_tests = (
    "ollama" in settings.INFERENCE_BASE_URL
    or "localhost" in settings.INFERENCE_BASE_URL
    or "ollama" in settings.INFERENCE_DEPLOYMENT_NAME
)

pytest_mark = pytest.mark.skipif(
    not should_run_ollama_tests,
    reason="Ollama tests skipped: INFERENCE_BASE_URL or INFERENCE_DEPLOYMENT_NAME are not using ollama models",
)

ollama_model_name = settings.INFERENCE_DEPLOYMENT_NAME.split("/")[1]


@pytest_mark
def test_ping_ollama():
    response = requests.get(settings.INFERENCE_BASE_URL)
    assert response.status_code == 200


@pytest_mark
@pytest.fixture(scope="module")
def download_model_fixture():
    ollama.pull(ollama_model_name)
    models = [model for model in ollama.list()][0][1]
    models_names = [model.model for model in models]
    logger.debug(f" list models: {models_names}")
    assert ollama_model_name in models_names
    # ollama.delete(ollama_model_name)


@pytest_mark
def test_ollama_run():
    ollama.show(ollama_model_name)


@pytest_mark
def test_ollama_chat(download_model_fixture):
    res = ollama.chat(model=ollama_model_name, messages=[{"role": "user", "content": "Hi"}])
    logger.info(f" res is {res}")
    assert type(res.message.content) == str

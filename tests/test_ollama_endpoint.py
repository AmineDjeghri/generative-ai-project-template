import ollama
import requests
import pytest

from genai_template_backend.backend_settings import settings, logger

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("require_ollama")]

ollama_model_name = settings.INFERENCE_DEPLOYMENT_NAME.split("/")[-1]


def test_ping_ollama():
    response = requests.get(settings.INFERENCE_BASE_URL, timeout=3)
    assert response.status_code == 200


@pytest.fixture(scope="module")
def download_model_fixture():
    ollama.pull(ollama_model_name)
    models = [model for model in ollama.list()][0][1]
    models_names = [model.model for model in models]
    logger.debug(f" list models: {models_names}")
    assert ollama_model_name in models_names


def test_ollama_run():
    ollama.show(ollama_model_name)


def test_ollama_chat(download_model_fixture):
    res = ollama.chat(model=ollama_model_name, messages=[{"role": "user", "content": "Hi"}])
    logger.info(f" res is {res}")
    assert isinstance(res.message.content, str)

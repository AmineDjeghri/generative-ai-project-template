import requests
import pytest

from genai_template_backend.backend_settings import settings, logger

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("require_ollama")]

ollama_model_name = settings.INFERENCE_DEPLOYMENT_NAME.split("/", 1)[-1]


@pytest.fixture(scope="module")
def ollama_client():
    import ollama

    with ollama.Client(host=settings.INFERENCE_BASE_URL, timeout=120) as client:
        yield client


def test_ping_ollama():
    response = requests.get(settings.INFERENCE_BASE_URL, timeout=3)
    assert response.status_code == 200


@pytest.fixture(scope="module")
def require_model(ollama_client):
    models_names = [model.model for model in ollama_client.list().models]
    logger.debug(f" list models: {models_names}")
    assert ollama_model_name in models_names, (
        "Install the configured model before running integration"
    )


def test_ollama_run(ollama_client, require_model):
    ollama_client.show(ollama_model_name)


def test_ollama_chat(ollama_client, require_model):
    res = ollama_client.chat(model=ollama_model_name, messages=[{"role": "user", "content": "Hi"}])
    logger.info(f" res is {res}")
    assert isinstance(res.message.content, str)

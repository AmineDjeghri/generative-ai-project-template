"""Live-service prerequisites are evaluated only when integration fixtures run."""

import os

import pytest
import requests


os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"


def pytest_configure(config):
    """Provide synthetic settings for self-contained tests and credential-free collection."""
    if config.option.collectonly or config.option.markexpr in {
        "not integration",
        "not integration and not hardware",
        "hardware",
    }:
        os.environ.setdefault("INFERENCE_BASE_URL", "http://127.0.0.1:9")
        os.environ.setdefault("INFERENCE_API_KEY", "unused-test-value")
        os.environ.setdefault("INFERENCE_DEPLOYMENT_NAME", "test/model")


@pytest.fixture(scope="session")
def require_llm():
    """Validate the configured endpoint at test execution, never during collection."""
    from genai_template_backend.backend_settings import settings

    if not settings.INFERENCE_API_KEY.get_secret_value() or not settings.INFERENCE_BASE_URL:
        pytest.fail("Integration tests require INFERENCE_API_KEY and INFERENCE_BASE_URL")
    try:
        response = requests.get(settings.INFERENCE_BASE_URL, timeout=3)
    except requests.RequestException:
        pytest.fail("The configured LLM endpoint is unreachable", pytrace=False)
    if response.status_code >= 500:
        pytest.fail("The configured LLM endpoint is unavailable", pytrace=False)


@pytest.fixture(scope="session")
def require_ollama():
    """Probe Ollama only while running its explicitly selected integration tests."""
    from genai_template_backend.backend_settings import settings

    configured = (
        "ollama" in settings.INFERENCE_BASE_URL
        or "localhost" in settings.INFERENCE_BASE_URL
        or "127.0.0.1" in settings.INFERENCE_BASE_URL
        or "ollama" in settings.INFERENCE_DEPLOYMENT_NAME
    )
    if not configured:
        pytest.skip("Ollama suite is not applicable to the configured LLM provider")
    try:
        response = requests.get(settings.INFERENCE_BASE_URL, timeout=2)
    except requests.RequestException:
        pytest.fail("The configured Ollama endpoint is unreachable", pytrace=False)
    if response.status_code != 200:
        pytest.fail("The configured Ollama endpoint is unavailable", pytrace=False)

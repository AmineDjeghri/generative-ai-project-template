"""Prerequisites for tests that explicitly call live model services."""

from urllib.parse import urlsplit, urlunsplit

import pytest
import requests


def _inference_details(settings):
    missing = [
        name
        for name in ("INFERENCE_BASE_URL", "INFERENCE_DEPLOYMENT_NAME")
        if not str(getattr(settings, name, "") or "").strip()
    ]
    if not settings.INFERENCE_API_KEY.get_secret_value().strip():
        missing.append("INFERENCE_API_KEY")
    if missing:
        pytest.fail("Integration tests require " + ", ".join(missing), pytrace=False)
    try:
        url = urlsplit(settings.INFERENCE_BASE_URL)
        if url.scheme not in {"http", "https"} or not url.hostname:
            raise ValueError
        _ = url.port
    except ValueError:
        pytest.fail("INFERENCE_BASE_URL must be a valid HTTP(S) URL and port", pytrace=False)
    safe_url = urlunsplit((url.scheme, url.netloc.rsplit("@", 1)[-1], url.path, "", ""))
    return (
        f"INFERENCE_BASE_URL={safe_url}; "
        f"INFERENCE_DEPLOYMENT_NAME={settings.INFERENCE_DEPLOYMENT_NAME}; "
        "INFERENCE_API_KEY=<set>"
    )


@pytest.fixture(scope="session")
def require_llm():
    """Validate the configured endpoint at test execution, never during collection."""
    from genai_template_backend.backend_settings import settings

    details = _inference_details(settings)
    try:
        response = requests.get(settings.INFERENCE_BASE_URL, timeout=3)
    except requests.RequestException as error:
        pytest.fail(f"LLM endpoint unreachable ({type(error).__name__}): {details}", pytrace=False)
    if response.status_code >= 500:
        pytest.fail(f"LLM endpoint returned HTTP {response.status_code}: {details}", pytrace=False)


@pytest.fixture(scope="session")
def require_ollama():
    """Probe Ollama only while running its explicitly selected integration tests."""
    from genai_template_backend.backend_settings import settings

    details = _inference_details(settings)
    configured = (
        "ollama" in settings.INFERENCE_BASE_URL
        or "localhost" in settings.INFERENCE_BASE_URL
        or "127.0.0.1" in settings.INFERENCE_BASE_URL
        or "ollama" in settings.INFERENCE_DEPLOYMENT_NAME
    )
    if not configured:
        pytest.skip(f"Ollama suite is not applicable to INFERENCE_DEPLOYMENT_NAME: {details}")
    try:
        response = requests.get(settings.INFERENCE_BASE_URL, timeout=2)
    except requests.RequestException as error:
        pytest.fail(
            f"Ollama endpoint unreachable ({type(error).__name__}): {details}", pytrace=False
        )
    if response.status_code != 200:
        pytest.fail(
            f"Ollama endpoint returned HTTP {response.status_code}: {details}", pytrace=False
        )

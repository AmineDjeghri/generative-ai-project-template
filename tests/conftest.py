import requests
import pytest

from genai_template_backend.backend_settings import settings


def is_llm_configured():
    """Check that credentials are set and the LLM endpoint is reachable."""
    api_key = settings.INFERENCE_API_KEY.get_secret_value()
    if not api_key or not settings.INFERENCE_BASE_URL:
        return False
    try:
        response = requests.get(settings.INFERENCE_BASE_URL, timeout=3)
        return response.status_code < 500
    except Exception:
        return False


skip_if_llm_not_configured = pytest.mark.skipif(
    not is_llm_configured(),
    reason=f"LLM endpoint not reachable at {settings.INFERENCE_BASE_URL}",
)

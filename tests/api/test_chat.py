import pytest
from fastapi.testclient import TestClient

from genai_template_backend.app import app
from tests.conftest import is_llm_configured


@pytest.fixture
def client():
    """Create a TestClient instance for the FastAPI app."""
    return TestClient(app)


@pytest.mark.integration
@pytest.mark.skipif(
    not is_llm_configured(),
    reason="LLM credentials not configured: INFERENCE_API_KEY or INFERENCE_BASE_URL is missing",
)
def test_post_chat_message_integration(client):
    """Test the /api/chat endpoint by making a real call to the LLM.

    This is an integration test and requires a configured environment with a running LLM.
    """
    response = client.post("/api/chat", json={"message": "Hello, how are you?"})

    assert response.status_code == 200
    response_data = response.json()
    assert "response" in response_data
    assert isinstance(response_data["response"], str)
    assert len(response_data["response"]) > 0
    assert not response_data["response"].lower().startswith("error")

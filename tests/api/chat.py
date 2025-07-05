import pytest
from fastapi.testclient import TestClient

# The app is imported from the backend source
from genai_template_backend.app import app


@pytest.fixture
def client():
    """Create a TestClient instance for the FastAPI app."""
    return TestClient(app)


@pytest.mark.integration
def test_post_chat_message_integration(client):
    """
    Test the /api/chat endpoint by making a real call to the LLM.
    This is an integration test and requires a configured environment with a running LLM.
    """
    # Act: Make a POST request to the endpoint. The message content doesn't matter
    # for this test since the route uses a hardcoded prompt.
    response = client.post("/api/chat", params={"message": "test"})

    # Assert: Check for a successful response and valid content
    assert response.status_code == 200
    response_data = response.json()
    assert "response" in response_data
    assert isinstance(response_data["response"], str)
    # Check that the response is not empty and not an error message
    assert len(response_data["response"]) > 0
    assert not response_data["response"].lower().startswith("error")
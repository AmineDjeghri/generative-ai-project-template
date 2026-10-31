from functools import partial

import pytest
from fastapi.testclient import TestClient

from genai_template_backend.api.routes import chat
from genai_template_backend.app import app
from genai_template_backend.backend_settings import settings


@pytest.fixture
def client(monkeypatch):
    """Exercise the real API and model client with a bounded generation budget."""
    monkeypatch.setattr(
        chat,
        "InferenceLLMConfig",
        partial(
            chat.InferenceLLMConfig,
            max_tokens=64,
            reasoning_effort=(
                "none"
                if settings.INFERENCE_DEPLOYMENT_NAME.startswith(("ollama/", "ollama_chat/"))
                else None
            ),
        ),
    )
    return TestClient(app)


@pytest.mark.integration
def test_post_chat_message_integration(client, require_llm):
    """Test the /api/chat endpoint by making a real call to the LLM.

    This is an integration test and requires a configured environment with a running LLM.
    """
    response = client.post("/api/chat", json={"message": "Reply with only hello."})

    assert response.status_code == 200
    response_data = response.json()
    assert "response" in response_data
    assert isinstance(response_data["response"], str)
    assert response_data["response"].strip()
    assert not response_data["response"].lower().startswith("error")

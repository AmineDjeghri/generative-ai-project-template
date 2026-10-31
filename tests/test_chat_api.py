"""API behavior with asynchronous provider substitutes and no live services."""

from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
import litellm
import pytest

from genai_template_backend.app import app
from genai_template_backend.api.llm import InferenceLLMConfig


@pytest.mark.parametrize("reply", ["hello", "Error: is a useful prefix to discuss"])
def test_chat_awaits_provider_and_accepts_normal_text(monkeypatch, reply):
    generate = AsyncMock(return_value=reply)
    monkeypatch.setattr(InferenceLLMConfig, "a_generate", generate)
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"message": "hello"})
        assert client.get("/api/").status_code == 200
    assert response.status_code == 200
    assert response.json() == {"response": reply}
    generate.assert_awaited_once_with("hello")


@pytest.mark.parametrize(
    "error,status",
    [
        (TimeoutError(), 504),
        (litellm.RateLimitError("limited", llm_provider="ollama", model="test"), 503),
        (RuntimeError("private provider details"), 502),
    ],
)
def test_provider_failures_have_safe_http_status(monkeypatch, error, status):
    monkeypatch.setattr(InferenceLLMConfig, "a_generate", AsyncMock(side_effect=error))
    with TestClient(app) as client:
        response = client.post("/api/chat", json={"message": "hello"})
    assert response.status_code == status
    assert "private provider details" not in response.text


@pytest.mark.parametrize("message", ["", "   "])
def test_blank_message_never_calls_provider(monkeypatch, message):
    generate = AsyncMock()
    monkeypatch.setattr(InferenceLLMConfig, "a_generate", generate)
    with TestClient(app) as client:
        assert client.post("/api/chat", json={"message": message}).status_code == 422
    generate.assert_not_awaited()


def test_empty_provider_response_is_bad_gateway(monkeypatch):
    monkeypatch.setattr(InferenceLLMConfig, "a_generate", AsyncMock(return_value=None))
    with TestClient(app) as client:
        assert client.post("/api/chat", json={"message": "hello"}).status_code == 502

"""Regression checks for provider-independent generation and embedding behavior."""

import inspect
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import litellm
import pytest
from pydantic import BaseModel
from tenacity import wait_none

from genai_template_backend.api.llm import EmbeddingLLMConfig, InferenceLLMConfig


class Answer(BaseModel):
    valid: bool
    value: str | None


@pytest.fixture
def llm(monkeypatch):
    monkeypatch.setattr(litellm, "supports_response_schema", lambda **kwargs: True)
    return InferenceLLMConfig(
        model_name="ollama/test",
        base_url="http://unused",
        api_key="synthetic",  # pragma: allowlist secret (test placeholder)
        temperature=0.2,
        max_tokens=32,
    )


def response(content='{"valid": true, "value": null}', finish_reason="stop"):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(finish_reason=finish_reason, message=SimpleNamespace(content=content))
        ]
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("asynchronous", [False, True])
async def test_native_json_and_parameter_overrides(monkeypatch, llm, asynchronous):
    provider = AsyncMock(return_value=response()) if asynchronous else Mock(return_value=response())
    monkeypatch.setattr(litellm, "acompletion" if asynchronous else "completion", provider)
    generate = llm.a_generate if asynchronous else llm.generate
    result = generate("hello", schema=Answer, temperature=0.7, timeout=12)
    if inspect.isawaitable(result):
        result = await result
    assert result == Answer(valid=True, value=None)
    arguments = provider.call_args.kwargs
    assert arguments["temperature"] == 0.7
    assert arguments["timeout"] == 12
    assert arguments["max_tokens"] == 32
    assert arguments["seed"] == 1729
    assert arguments["model"] == "ollama/test"


@pytest.mark.asyncio
@pytest.mark.parametrize("asynchronous", [False, True])
async def test_rate_limits_retry_and_then_propagate(monkeypatch, llm, asynchronous):
    error = litellm.RateLimitError("limited", llm_provider="ollama", model="test")
    provider = AsyncMock(side_effect=error) if asynchronous else Mock(side_effect=error)
    monkeypatch.setattr(litellm, "acompletion" if asynchronous else "completion", provider)
    method = llm.a_generate_from_messages if asynchronous else llm.generate_from_messages
    monkeypatch.setattr(method.retry, "wait", wait_none())
    with pytest.raises(litellm.RateLimitError):
        result = method([{"role": "user", "content": "hello"}])
        if inspect.isawaitable(result):
            await result
    assert provider.call_count == 3


@pytest.mark.asyncio
@pytest.mark.parametrize("asynchronous", [False, True])
async def test_instructor_fallback_preserves_options(monkeypatch, llm, asynchronous):
    monkeypatch.setattr(litellm, "supports_response_schema", lambda **kwargs: False)
    parsed = Answer(valid=True, value=None)
    raw = response()
    create = (
        AsyncMock(return_value=(parsed, raw)) if asynchronous else Mock(return_value=(parsed, raw))
    )
    client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create_with_completion=create))
    )
    monkeypatch.setattr(
        "genai_template_backend.api.llm.instructor.from_litellm", lambda *args, **kwargs: client
    )
    generate = llm.a_generate if asynchronous else llm.generate
    result = generate("hello", schema=Answer, timeout=9, raw_response=True)
    if inspect.isawaitable(result):
        result = await result
    assert result is raw
    assert create.call_args.kwargs["timeout"] == 9
    assert create.call_args.kwargs["response_model"] is Answer


def test_raw_response_does_not_attempt_json_parsing(monkeypatch, llm):
    raw = response("not JSON")
    monkeypatch.setattr(litellm, "completion", lambda **kwargs: raw)
    assert llm.generate("hello", schema=Answer, raw_response=True) is raw


def test_content_filter_propagates(monkeypatch, llm):
    monkeypatch.setattr(litellm, "completion", lambda **kwargs: response(None, "content_filter"))
    with pytest.raises(ValueError, match="content filter"):
        llm.generate("hello")


@pytest.mark.asyncio
async def test_embeddings_are_independent_and_use_dictionary_results(monkeypatch):
    client = EmbeddingLLMConfig(
        model_name="ollama/embed",
        base_url="http://unused",
        api_key="synthetic",  # pragma: allowlist secret
    )
    result = SimpleNamespace(data=[{"embedding": [0.1, 0.2]}])
    sync = Mock(return_value=result)
    asynchronous = AsyncMock(return_value=result)
    monkeypatch.setattr(litellm, "embedding", sync)
    monkeypatch.setattr(litellm, "aembedding", asynchronous)
    assert client.embed_text("hello") == [0.1, 0.2]
    assert await client.a_embed_text("hello") == [0.1, 0.2]
    assert sync.call_args.kwargs["api_base"] == "http://unused"
    assert asynchronous.call_args.kwargs["api_base"] == "http://unused"
    assert not isinstance(client, InferenceLLMConfig)


@pytest.mark.asyncio
@pytest.mark.parametrize("asynchronous", [False, True])
async def test_instructor_wrapped_rate_limits_are_retried(monkeypatch, llm, asynchronous):
    monkeypatch.setattr(litellm, "supports_response_schema", lambda **kwargs: False)
    error = RuntimeError("structured output wrapper")
    error.__cause__ = litellm.RateLimitError("limited", llm_provider="ollama", model="test")
    create = AsyncMock(side_effect=error) if asynchronous else Mock(side_effect=error)
    client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create_with_completion=create))
    )
    monkeypatch.setattr(
        "genai_template_backend.api.llm.instructor.from_litellm", lambda *args, **kwargs: client
    )
    method = llm.a_generate_from_messages if asynchronous else llm.generate_from_messages
    monkeypatch.setattr(method.retry, "wait", wait_none())
    with pytest.raises(RuntimeError, match="structured output wrapper"):
        result = method([{"role": "user", "content": "hello"}], schema=Answer)
        if inspect.isawaitable(result):
            await result
    assert create.call_count == 3

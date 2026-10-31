import pytest
from litellm.types.utils import ModelResponse
from pydantic import BaseModel

from genai_template_backend.backend_settings import settings
from genai_template_backend.api.llm import InferenceLLMConfig


@pytest.fixture(scope="module")
def llm(require_llm):
    return InferenceLLMConfig(
        model_name=settings.INFERENCE_DEPLOYMENT_NAME,
        api_key=settings.INFERENCE_API_KEY,
        base_url=settings.INFERENCE_BASE_URL,
        api_version=settings.INFERENCE_API_VERSION,
        max_tokens=64,
        reasoning_effort=(
            "none"
            if settings.INFERENCE_DEPLOYMENT_NAME.startswith(("ollama/", "ollama_chat/"))
            else None
        ),
    )


@pytest.mark.integration
def test_inference_llm(llm):
    """Test the LLM client used to generate answers."""
    res = llm.generate_from_messages(
        messages=[{"role": "user", "content": "Reply with only hello."}],
    )
    assert res is not None
    assert isinstance(res, str)
    assert res.strip()


@pytest.mark.integration
def test_inference_llm_raw(llm):
    """Test the LLM client used to generate answers with raw response."""
    res = llm.generate_from_messages(
        messages=[{"role": "user", "content": "Reply with only hello."}],
        raw_response=True,
    )
    assert res is not None
    assert isinstance(res, ModelResponse)
    assert isinstance(res.choices[0].message.content, str)
    assert res.choices[0].message.content.strip()


@pytest.mark.integration
def test_inference_llm_schema(llm):
    """Test the LLM client used to generate answers with schema response."""

    class Person(BaseModel):
        name: str
        age: int

    res = llm.generate_from_messages(
        messages=[{"role": "user", "content": "Extract the person: John is 30 years old."}],
        schema=Person,
    )

    assert res is not None
    assert isinstance(res, Person)
    assert res.name == "John"
    assert res.age == 30

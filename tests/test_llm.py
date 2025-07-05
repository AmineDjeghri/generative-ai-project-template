from litellm.types.utils import ModelResponse
from pydantic import BaseModel

from genai_template_backend.env_settings import settings
from genai_template_backend.api.llm import InferenceLLMConfig


def test_inference_llm():
    """Test the LLM client used to generate answers."""
    llm = InferenceLLMConfig(
        model_name=settings.INFERENCE_DEPLOYMENT_NAME,
        api_key=settings.INFERENCE_API_KEY,
        base_url=settings.INFERENCE_BASE_URL,
        api_version=settings.INFERENCE_API_VERSION,
    )

    res = llm.generate_from_messages(
        messages=[
            {"role": "user", "content": "Hello, I'm a human!"},
        ],
    )
    assert res is not None
    assert isinstance(res, str)


def test_inference_llm_raw():
    """Test the LLM client used to generate answers with raw response."""
    llm = InferenceLLMConfig(
        model_name=settings.INFERENCE_DEPLOYMENT_NAME,
        api_key=settings.INFERENCE_API_KEY,
        base_url=settings.INFERENCE_BASE_URL,
        api_version=settings.INFERENCE_API_VERSION,
    )

    res = llm.generate_from_messages(
        messages=[
            {"role": "user", "content": "Hello, I'm a human!"},
        ],
        raw_response=True,
    )
    assert res is not None
    assert isinstance(res, ModelResponse)
    assert isinstance(res.choices[0].message.content, str)


def test_inference_llm_schema():
    """Test the LLM client used to generate answers with schema response."""
    llm = InferenceLLMConfig(
        model_name=settings.INFERENCE_DEPLOYMENT_NAME,
        api_key=settings.INFERENCE_API_KEY,
        base_url=settings.INFERENCE_BASE_URL,
        api_version=settings.INFERENCE_API_VERSION,
    )

    class Person(BaseModel):
        name: str
        age: int

    res = llm.generate_from_messages(
        messages=[
            {"role": "user", "content": "Hello, My name is John and I am 30 years old."},
        ],
        schema=Person,
    )

    assert res is not None
    assert isinstance(res, Person)
    assert isinstance(res.name, str)
    assert isinstance(res.age, int)

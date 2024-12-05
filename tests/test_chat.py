import pytest
from openai.types.chat import ChatCompletion
from pydantic import BaseModel, Field

from ml.ai import get_completions

messages = [{"role": "system", "content": "You are a helpful assistant."}]
inputs = {
    "messages": messages,
}


def test_get_chat_completions():
    response = get_completions(
        **inputs,
        stream=False,
    )

    assert len(response) > 0
    assert type(response) == str


def test_get_chat_completions_model():
    # This function uses instructor, open source models may not pass it.
    global messages  # overriding global variable
    messages = [
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Client number account: 208977"},
    ]

    class UserInfo(BaseModel):
        number_account: str = Field(default=None, description="Client number account")

    response = get_completions(**inputs, stream=False, response_model=UserInfo)
    assert isinstance(response, UserInfo)


def test_get_chat_completions_full_response():
    response = get_completions(**inputs, stream=False, full_response=True)

    assert response is not None
    assert type(response) == ChatCompletion


def test_get_chat_completions_exception():
    with pytest.raises(NotImplementedError):
        get_completions(
            **inputs,
            stream=True,
        )


def test_get_chat_completions_none():
    global inputs
    inputs["messages"] = None

    with pytest.raises(NotImplementedError):
        response = get_completions(
            **inputs,
            stream=True,
        )
        assert response is None

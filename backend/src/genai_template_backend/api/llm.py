"""Small synchronous and asynchronous clients for inference and embeddings."""

import instructor
import litellm
from pydantic import BaseModel, SecretStr
from tenacity import (
    retry,
    retry_if_exception_cause_type,
    retry_if_exception_type,
    stop_after_attempt,
    wait_fixed,
)

from genai_template_backend.backend_settings import settings


class LLMConnection(BaseModel):
    """Connection parameters shared by the two independent clients."""

    model_name: str
    base_url: str
    api_key: SecretStr
    api_version: str = "2025-02-01-preview"

    def _connection_parameters(self):
        return {
            "model": self.model_name,
            "base_url": self.base_url,
            "api_key": self.api_key.get_secret_value(),
            "api_version": self.api_version,
        }


def _parse_response(response, schema, raw_response):
    if response.choices[0].finish_reason == "content_filter":
        raise ValueError("Response blocked by the content filter")
    if raw_response:
        return response
    content = response.choices[0].message.content
    if schema:
        return schema.model_validate_json(content)
    return content


class InferenceLLMConfig(LLMConnection):
    """Generate text or validated structured output without hiding provider errors."""

    temperature: float | None = None
    seed: int | None = 1729
    max_tokens: int | None = None
    reasoning_effort: str | None = None

    @property
    def supports_response_schema(self) -> bool:
        return litellm.supports_response_schema(model=self.model_name)

    def _parameters(self, messages, **kwargs):
        parameters = {
            **self._connection_parameters(),
            "messages": messages,
            "timeout": settings.INFERENCE_TIMEOUT_SECONDS,
            "drop_params": True,
            "num_retries": 0,
        }
        for name in ("temperature", "seed", "max_tokens", "reasoning_effort"):
            value = getattr(self, name)
            if value is not None:
                parameters[name] = value
        parameters.update(kwargs)
        return parameters

    def generate(self, prompt: str, schema=None, raw_response=False, **kwargs):
        return self.generate_from_messages(
            [{"role": "user", "content": prompt}], schema, raw_response, **kwargs
        )

    async def a_generate(self, prompt: str, schema=None, raw_response=False, **kwargs):
        return await self.a_generate_from_messages(
            [{"role": "user", "content": prompt}], schema, raw_response, **kwargs
        )

    @retry(
        wait=wait_fixed(settings.INFERENCE_RETRY_WAIT_SECONDS),
        stop=stop_after_attempt(settings.INFERENCE_MAX_ATTEMPTS),
        retry=(
            retry_if_exception_type(litellm.RateLimitError)
            | retry_if_exception_cause_type(litellm.RateLimitError)
        ),
        reraise=True,
    )
    def generate_from_messages(self, messages: list, schema=None, raw_response=False, **kwargs):
        parameters = self._parameters(messages, **kwargs)
        if schema and not self.supports_response_schema:
            client = instructor.from_litellm(litellm.completion, mode=instructor.Mode.JSON)
            output, response = client.chat.completions.create_with_completion(
                **parameters, response_model=schema, max_retries=1
            )
            return response if raw_response else output
        if schema:
            parameters["response_format"] = schema
        return _parse_response(litellm.completion(**parameters), schema, raw_response)

    @retry(
        wait=wait_fixed(settings.INFERENCE_RETRY_WAIT_SECONDS),
        stop=stop_after_attempt(settings.INFERENCE_MAX_ATTEMPTS),
        retry=(
            retry_if_exception_type(litellm.RateLimitError)
            | retry_if_exception_cause_type(litellm.RateLimitError)
        ),
        reraise=True,
    )
    async def a_generate_from_messages(
        self, messages: list, schema=None, raw_response=False, **kwargs
    ):
        parameters = self._parameters(messages, **kwargs)
        if schema and not self.supports_response_schema:
            client = instructor.from_litellm(litellm.acompletion, mode=instructor.Mode.JSON)
            output, response = await client.chat.completions.create_with_completion(
                **parameters, response_model=schema, max_retries=1
            )
            return response if raw_response else output
        if schema:
            parameters["response_format"] = schema
        return _parse_response(await litellm.acompletion(**parameters), schema, raw_response)


class EmbeddingLLMConfig(LLMConnection):
    """Embed text without inheriting generation behavior or schema detection."""

    def _connection_parameters(self):
        parameters = super()._connection_parameters()
        parameters["api_base"] = parameters.pop("base_url")
        return parameters

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        response = litellm.embedding(**self._connection_parameters(), input=texts)
        return [item["embedding"] for item in response.data]

    def embed_text(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    async def a_embed_texts(self, texts: list[str]) -> list[list[float]]:
        response = await litellm.aembedding(**self._connection_parameters(), input=texts)
        return [item["embedding"] for item in response.data]

    async def a_embed_text(self, text: str) -> list[float]:
        return (await self.a_embed_texts([text]))[0]

    def get_model_name(self):
        return self.model_name

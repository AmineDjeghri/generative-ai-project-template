import ast
from typing import Optional, Type

import instructor
import litellm
from litellm import supports_response_schema, acompletion, completion, aembedding, embedding
from pydantic import BaseModel, SecretStr, ConfigDict, model_validator
from typing_extensions import Self

from tenacity import (
    retry,
    stop_after_attempt,
    wait_fixed,
    retry_if_exception_type,
)

from genai_template_backend.env_settings import logger


class InferenceLLMConfig(BaseModel):
    """Configuration for the inference model."""

    model_name: str
    base_url: str
    api_key: SecretStr
    api_version: str = "2024-12-01-preview"  # used only if model is from azure openai
    model_config = ConfigDict(arbitrary_types_allowed=True)

    supports_response_schema: bool = False

    temperature: Optional[float] = None
    seed: int = 1729
    max_tokens: Optional[int] = None

    @model_validator(mode="after")
    def init_client(self) -> Self:
        litellm.drop_params = True
        self.supports_response_schema = supports_response_schema(self.model_name.split("/")[-1])
        return self

    def load_model(self, prompt: str, schema: Optional[Type[BaseModel]] = None, *args, **kwargs):
        pass

    async def a_generate(
        self,
        prompt: str,
        schema: Optional[Type[BaseModel]] = None,
        raw_response: bool = False,
        *args,
        **kwargs,
    ):
        messages = [{"role": "user", "content": prompt}]
        return await self.a_generate_from_messages(
            messages=messages, schema=schema, raw_response=raw_response, *args, **kwargs
        )

    @retry(
        wait=wait_fixed(60),
        stop=stop_after_attempt(6),
        retry=retry_if_exception_type(
            (litellm.exceptions.RateLimitError, instructor.exceptions.InstructorRetryException)
        ),
    )
    async def a_generate_from_messages(
        self,
        messages: list,
        schema: Optional[Type[BaseModel]] = None,
        raw_response: bool = False,
        *args,
        **kwargs,
    ):
        # check if model supports structured output
        if schema:
            if self.supports_response_schema:
                res = await litellm.acompletion(
                    model=self.model_name,
                    api_key=self.api_key.get_secret_value(),
                    base_url=self.base_url,
                    messages=messages,
                    response_format=schema,
                    api_version=self.api_version,
                )
                if res.choices[0].finish_reason == "content_filter":
                    raise ValueError(f"Response filtred by content filter")
                else:
                    dict_res = ast.literal_eval(res.choices[0].message.content)

                    if raw_response:
                        return res
                    return schema(**dict_res)

            else:
                client = instructor.from_litellm(acompletion, mode=instructor.Mode.JSON)
                output, raw_completion = await client.chat.completions.create_with_completion(
                    model=self.model_name,
                    api_key=self.api_key.get_secret_value(),
                    base_url=self.base_url,
                    messages=messages,
                    response_model=schema,
                    api_version=self.api_version,
                )

                if raw_response:
                    return raw_completion
                return output

        else:
            res = await litellm.acompletion(
                model=self.model_name,
                api_key=self.api_key.get_secret_value(),
                base_url=self.base_url,
                messages=messages,
                api_version=self.api_version,
            )

            if raw_response:
                return res
            return res.choices[0].message.content

    def generate(
        self,
        prompt: str,
        schema: Optional[Type[BaseModel]] = None,
        raw_response: bool = False,
        *args,
        **kwargs,
    ):
        messages = [{"role": "user", "content": prompt}]
        return self.generate_from_messages(
            messages=messages, schema=schema, raw_response=raw_response, *args, **kwargs
        )

    @retry(
        wait=wait_fixed(60),
        stop=stop_after_attempt(6),
        retry=retry_if_exception_type(
            (litellm.exceptions.RateLimitError, instructor.exceptions.InstructorRetryException)
        ),
    )
    def generate_from_messages(
        self,
        messages: list,
        schema: Optional[Type[BaseModel]] = None,
        raw_response: bool = False,
        *args,
        **kwargs,
    ):
        try:
            # check if model supports structured output
            if schema:
                if self.supports_response_schema:
                    res = litellm.completion(
                        model=self.model_name,
                        api_key=self.api_key.get_secret_value(),
                        base_url=self.base_url,
                        messages=messages,
                        response_format=schema,
                        api_version=self.api_version,
                        *args,
                        **kwargs,
                    )
                    if res.choices[0].finish_reason == "content_filter":
                        raise ValueError(f"Response filtred by content filter")
                    else:
                        dict_res = ast.literal_eval(res.choices[0].message.content)

                        if raw_response:
                            return res
                        return schema(**dict_res)

                else:
                    client = instructor.from_litellm(completion, mode=instructor.Mode.JSON)
                    res, raw_completion = client.chat.completions.create_with_completion(
                        model=self.model_name,
                        api_key=self.api_key.get_secret_value(),
                        base_url=self.base_url,
                        messages=messages,
                        response_model=schema,
                        api_version=self.api_version,
                        *args,
                        **kwargs,
                    )

                    if raw_response:
                        return raw_completion
                    return res
            else:
                res = litellm.completion(
                    model=self.model_name,
                    api_key=self.api_key.get_secret_value(),
                    base_url=self.base_url,
                    messages=messages,
                    api_version=self.api_version,
                    *args,
                    **kwargs,
                )
                if raw_response:
                    return res
                return res.choices[0].message.content
        except Exception as e:
            # todo handle cost if exception
            logger.error(f"Error in generating response from LLM: {e}")
            return None


class EmbeddingLLMConfig(InferenceLLMConfig):
    """Configuration for the embedding model."""

    model_name: str
    base_url: str
    api_key: SecretStr
    api_version: str = "2024-12-01-preview"  # used only if model is from azure openai
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def load_model(self, prompt: str, schema: Optional[Type[BaseModel]] = None, *args, **kwargs):
        pass

    def embed_text(self, text: str) -> list[float]:
        response = embedding(
            model=self.model_name,
            api_base=self.base_url,
            api_key=self.api_key.get_secret_value(),
            input=[text],
        )
        return response.data[0]["embedding"]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        response = embedding(
            model=self.model_name,
            api_base=self.base_url,
            api_key=self.api_key.get_secret_value(),
            input=texts,
        )
        return [data.embedding for data in response.data]

    async def a_embed_text(self, text: str) -> list[float]:
        response = await aembedding(
            model=self.model_name,
            api_base=self.base_url,
            api_key=self.api_key.get_secret_value(),
            input=[text],
        )
        return response.data[0]["embedding"]

    async def a_embed_texts(self, texts: list[str]) -> list[list[float]]:
        response = await aembedding(
            model=self.model_name,
            api_base=self.base_url,
            api_key=self.api_key.get_secret_value(),
            input=texts,
        )
        return [data.embedding for data in response.data]

    def get_model_name(self):
        return self.model_name

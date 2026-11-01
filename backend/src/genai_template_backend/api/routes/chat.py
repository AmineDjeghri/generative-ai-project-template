import asyncio

import litellm
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from genai_template_backend.api.llm import InferenceLLMConfig
from genai_template_backend.backend_settings import logger, settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    response: str


@router.post("/api/chat", response_model=ChatResponse)
async def post_chat_message(request: ChatRequest):
    llm = InferenceLLMConfig(
        model_name=settings.INFERENCE_DEPLOYMENT_NAME,
        api_key=settings.INFERENCE_API_KEY,
        base_url=settings.INFERENCE_BASE_URL,
        api_version=settings.INFERENCE_API_VERSION,
    )

    if not request.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    try:
        async with asyncio.timeout(settings.CHAT_TIMEOUT_SECONDS):
            response_text = await llm.a_generate(request.message)
    except TimeoutError, litellm.Timeout:
        raise HTTPException(status_code=504, detail="Model request timed out") from None
    except litellm.RateLimitError:
        raise HTTPException(status_code=503, detail="Model is temporarily rate limited") from None
    except Exception as error:
        logger.error("Model request failed ({})", type(error).__name__)
        raise HTTPException(status_code=502, detail="Model request failed") from None

    if not isinstance(response_text, str) or not response_text.strip():
        raise HTTPException(status_code=502, detail="Model returned an empty response")

    return ChatResponse(response=response_text)

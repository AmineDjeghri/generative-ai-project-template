from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from genai_template_backend.api.llm import InferenceLLMConfig
from genai_template_backend.env_settings import settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


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

    response_text = llm.generate_from_messages(
        messages=[
            {"role": "user", "content": request.message},
        ],
    )

    if not response_text or response_text.startswith("Error:"):
        raise HTTPException(status_code=404, detail=response_text)

    return ChatResponse(response=response_text)

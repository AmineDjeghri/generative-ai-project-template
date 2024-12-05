from enum import Enum

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ml.ai import get_rag_response
from utils import logger


class TagEnum(str, Enum):
    """API tags."""

    general = "general"
    tag_example = "tag_example"


router = APIRouter(prefix="/prefix_example", tags=[TagEnum.tag_example])


@router.get("/example/")
async def get_conversation_by_id(conversation_id: str):
    return JSONResponse(content="example response : 1234")


@router.get("/form/")
async def get_conversation_by_id(question: str):
    logger.debug(f"question: {question}")
    res = get_rag_response(question)
    return JSONResponse(content=res)

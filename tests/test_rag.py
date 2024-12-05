import os

import pytest

from ml.ai import get_related_document_ai_search, get_rag_response, run_azure_ai_search_indexer
from utils import logger, settings

logger.info(f" working directory is {os.getcwd()}")


@pytest.mark.skipif(
    not settings.ENABLE_AZURE_SEARCH, reason="requires env ENABLE_AZURE_SEARCH=True"
)
def test_get_related_document_ai_search():
    user_input = "What is the capital of France?"
    question_context = get_related_document_ai_search(user_input)

    assert type(question_context) == str


@pytest.mark.skipif(
    not settings.ENABLE_AZURE_SEARCH, reason="requires env ENABLE_AZURE_SEARCH=True"
)
def test_get_rag_response():
    res = get_rag_response("What is the capital of France?")
    assert type(res) == str


@pytest.mark.skipif(
    not settings.ENABLE_AZURE_SEARCH, reason="requires env ENABLE_AZURE_SEARCH=True"
)
def test_run_azure_ai_search_indexer():
    assert run_azure_ai_search_indexer().status_code == 202

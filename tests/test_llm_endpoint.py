import pytest

from utils import check_llm_client, check_llm_as_a_judge_client, settings


def test_llm_client():
    """Test the LLM client used to generate answers."""
    check_llm_client()


@pytest.mark.skipif(not settings.ENABLE_EVALUATION, reason="requires env ENABLE_EVALUATION=True")
def test_llmaaj_client():
    """Test the LLM as a judge client used in the evaluation."""
    check_llm_as_a_judge_client()

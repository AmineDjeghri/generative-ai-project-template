import math
import os

from evaluation.metrics.data_types import GradingResult
from utils import safe_eval


def get_assert(output: str, context) -> GradingResult:
    """Evaluates the precision at k."""
    retrieved_docs = safe_eval(context["vars"]["context"])
    relevant_docs = safe_eval(context["vars"]["relevant_context"])
    k = os.environ.get("K", 3)
    retrieved_docs_at_k = retrieved_docs[:k]
    relevant_count = sum([1 for doc in retrieved_docs_at_k if doc in relevant_docs])
    score = float(relevant_count / k)

    # threshold = context["test"]["metadata"]["threshold_ragas_as"]
    threshold = 0

    if math.isnan(score):
        score = 0.0

    return {
        "pass": score > threshold,
        "score": score,
        "reason": f"{score} > {threshold} = {score > threshold}",
    }

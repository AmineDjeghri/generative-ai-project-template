import math

from evaluation.metrics.data_types import GradingResult
from utils import safe_eval


# pomptfoo cwd is evaluations


# def ragas_context_answer_similarity(input, output, reference, metadata, expected) -> float:
# def get_assert(output: str, context) -> Union[bool, float, Dict[str, Any]]:
def get_assert(output: str, context) -> GradingResult:
    """Evaluates the precision at k."""
    retrieved_docs = safe_eval(context["vars"]["context"])
    relevant_docs = safe_eval(context["vars"]["relevant_context"])

    score = 0
    # compute Reciprocal Rank
    try:
        score = round(1 / (relevant_docs.index(retrieved_docs[0]) + 1), 2)
    except ValueError:
        score = -1

    # threshold = context["test"]["metadata"]["threshold_ragas_as"]
    threshold = 0

    if math.isnan(score):
        score = 0.0

    return {
        "pass": score > threshold,
        "score": score,
        "reason": f"{score} > {threshold} = {score > threshold}",
    }

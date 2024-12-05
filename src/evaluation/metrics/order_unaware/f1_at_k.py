import math


from evaluation.metrics.data_types import GradingResult
from evaluation.metrics.order_unaware import precision_at_k, recall_at_k


def get_assert(output: str, context) -> GradingResult:
    """Calculates F1@k."""
    precision = precision_at_k.get_assert(context=context, output=output)["score"]
    recall = recall_at_k.get_assert(context=context, output=output)["score"]

    if precision + recall == 0:
        score = 0.0
    else:
        score = round(float(2 * (precision * recall) / (precision + recall)), 2)

    # threshold = context["test"]["metadata"]["threshold_ragas_as"]
    threshold = 0

    if math.isnan(score):
        score = 0.0

    return {
        "pass": score > threshold,
        "score": score,
        "reason": f"{score} > {threshold} = {score > threshold}",
    }

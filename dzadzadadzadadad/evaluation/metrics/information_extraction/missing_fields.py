from pydantic import ValidationError

from evaluation.metrics.data_types import GradingResult
from evaluation.metrics.utils import create_dynamic_model, convert_to_json


def get_assert(output: str, context) -> GradingResult:
    """Evaluates the precision at k."""
    threshold = 0.99

    llm_answer, true_answer = convert_to_json(output, context, threshold)

    try:
        model_true_answer = create_dynamic_model(true_answer)
        # true_answer = model_true_answer(**true_answer)

        llm_answer = model_true_answer(**llm_answer)
        null_fields = [key for key, value in llm_answer.model_dump().items() if value is None]

        score = round(float(1 - (len(null_fields) / len(llm_answer.model_fields))), 2)

        reason = (
            f"{score} > {threshold} = {score > threshold}. Number of null fields: {len(null_fields)}. "
            f"null_fields: {null_fields}"
        )
    except ValidationError as e:
        error = validation_error_message(e)
        total_fields = len(llm_answer.model_fields)
        errors_count = len(error.errors())
        score = float(1 - (errors_count / total_fields))
        reason = str(error)

    return {
        "pass": score > threshold,
        "score": score,
        "reason": reason,
    }


def validation_error_message(error: ValidationError) -> ValidationError:
    for err in error.errors():
        err.pop("input")
        err.pop("url")

    return error

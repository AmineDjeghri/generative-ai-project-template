from pydantic import ValidationError

from evaluation.metrics.utils import create_dynamic_model, convert_to_json


def get_assert(output: str, context):
    """Evaluates the precision at k."""
    threshold = 0.99
    llm_answer, true_answer = convert_to_json(output, context, threshold)

    try:
        model_true_answer = create_dynamic_model(true_answer)
        true_answer = model_true_answer(**true_answer)

        llm_answer = model_true_answer(**llm_answer)

        if llm_answer == true_answer:
            score = 1.0
            reason = f"{score} > {threshold} = {score > threshold}"
        else:
            dict_a = llm_answer.model_dump()
            dict_b = true_answer.model_dump()
            differences = [key for key in dict_b.keys() if dict_a.get(key) != dict_b.get(key)]

            score = round(float(1 - (len(differences) / len(llm_answer.model_fields))), 2)

            reason = f"{score} > {threshold} = {score > threshold}. Number of differences: {len(differences)}. Differences: {differences}"

    except ValidationError as e:
        total_fields = len(llm_answer.model_fields)
        errors_count = len(e.errors())
        score = round(float(1 - (errors_count / total_fields)), 2)
        reason = str(e)

    return {
        "pass": score > threshold,
        "score": score,
        "reason": reason,
    }

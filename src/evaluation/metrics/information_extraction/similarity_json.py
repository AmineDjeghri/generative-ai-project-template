import numpy as np
from pydantic import ValidationError, BaseModel

from evaluation.metrics.utils import (
    create_dynamic_model,
    convert_to_json,
)
from utils import llmaaj_embedding_client


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

            num_similar_fields = len(llm_answer.model_fields) - len(differences)

            result, similarity = compare_pydantic_objects(llm_answer, true_answer, differences)
            score = round(
                float((num_similar_fields + similarity) / len(llm_answer.model_fields)),
                2,
            )

            reason = f"{score} > {threshold} = {score > threshold}. Number of differences: {len(differences)}. Differences: {result}"

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


def compare_pydantic_objects(
    obj1: BaseModel, obj2: BaseModel, differences: list = None
) -> dict[str, float]:
    """Compare two Pydantic objects using cosine similarity."""
    result = {}
    total_similarity = 0
    similarity = 0
    if not differences:
        differences = obj1.model_fields

    for field in differences:
        value1 = getattr(obj1, field)
        value2 = getattr(obj2, field)
        if value1 != value2:
            if value1 and value2:
                embedding1 = llmaaj_embedding_client.embed_query(text=str(value1))
                embedding2 = llmaaj_embedding_client.embed_query(text=str(value2))
                similarity = round(cosine_similarity(embedding1, embedding2), 2)
            else:
                similarity = 0
        else:
            similarity = 1

        result[field] = similarity
        total_similarity += similarity
    return result, total_similarity


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

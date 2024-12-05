import ast
import json
from typing import Optional

from datasets import Dataset
from pydantic import Field, create_model

from utils import logger


def safe_eval(x):
    try:
        return ast.literal_eval(x)
    except ValueError:
        raise Exception(f"Value error in safe")


def to_dataset(output, context):
    # question, ground truth and output can be dict (json information extraction) or str
    # dict: for example '{field:question}' , ground_truth is '{field: ground_truth}', output is '{field: answer}'
    # or simply strings
    question = context["vars"]["query"]
    ground_truth = context["vars"]["ground_truth"]
    contexts = context["vars"]["context"]

    # todo: add if is json parameter and also in the promptfoo config to support
    # string responses, json responses,

    try:
        output = safe_eval(output)
    except Exception:
        logger.warning(f" safe eval output: {output}")

    try:
        question = safe_eval(question)
    except Exception:
        logger.warning(f" safe eval question: {question}")

    try:
        ground_truth = safe_eval(ground_truth)
    except Exception:
        logger.warning(f" in safe eval ground_truth: {ground_truth}")

    try:
        contexts = safe_eval(contexts)
    except Exception:
        logger.warning(f" in safe eval contexts: {contexts}")

    # context should be a list of strings as input and we transform it to a list of list of str because of ragas
    if isinstance(contexts, list):
        if isinstance(contexts[0], str):
            if isinstance(ground_truth, dict):
                # if the output is a json response, we will evaluate each element of the json response to each
                # element of the json ground_truth. For each element, we copy the contexts received for the whole json.
                contexts = [contexts for _ in range(len(ground_truth))]
            else:
                contexts = [contexts]
        elif isinstance(contexts[0], list) and isinstance(contexts[0][0], str):
            pass
        else:
            raise Exception(
                f"Value error in Context should be a list of strings. Context: {contexts}"
            )
    else:
        raise Exception(f"Value error in Context should be a list of strings. Context: {contexts}")

    # question should be an str and we transform it to a list of string because of ragas
    if isinstance(question, dict) and isinstance(
        list(question.values())[0], str
    ):  # format is {field: question}
        question = list(question.values())
    elif isinstance(question, str):
        question = [question]
    elif not isinstance(question, list):
        raise Exception(f"Value error in question: {question}")

    # ground_truth should be an str and we transform it to a list of string because of ragas
    if isinstance(ground_truth, dict) and isinstance(list(ground_truth.values())[0], str):
        ground_truth = list(ground_truth.values())
    elif isinstance(ground_truth, str):
        ground_truth = [ground_truth]
    elif not isinstance(ground_truth, list):
        raise Exception(f"Value error in ground_truth: {ground_truth}")

    # output should be an str and we transform it to a list of string because of ragas
    if isinstance(output, dict) and isinstance(list(output.values())[0], str):
        output = list(output.values())
    elif isinstance(output, str):
        output = [output]
    else:
        raise Exception(f"Value error in output: {output}")

    # check if all the lists have the same length
    lengths = [len(ground_truth), len(contexts), len(question), len(output)]
    if len(set(lengths)) != 1:
        raise Exception(
            f"Output, ground truth, contexts and question should have the same length : "
            f"len output {len(output)}, len ground_truth {len(ground_truth)}, len contexts {len(contexts)}, "
            f"len question {len(question)}"
        )

    return Dataset.from_dict(
        {
            "ground_truth": ground_truth,
            "answer": output,
            "contexts": contexts,
            "question": question,
        }
    )


def to_evaldataset(output, context):
    # question, ground truth and output can be dict (json information extraction) or str
    # dict: for example '{field:question}' , ground_truth is '{field: ground_truth}', output is '{field: answer}'
    # or simply strings
    question = context["vars"]["query"]
    ground_truth = context["vars"]["ground_truth"]
    contexts = context["vars"]["context"]

    # todo: add if is json parameter and also in the promptfoo config to support
    # string responses, json responses,

    try:
        output = safe_eval(output)
    except Exception:
        logger.warning(f" safe eval output: {output}")

    try:
        question = safe_eval(question)
    except Exception:
        logger.warning(f" safe eval question: {question}")

    try:
        ground_truth = safe_eval(ground_truth)
    except Exception:
        logger.warning(f" in safe eval ground_truth: {ground_truth}")

    try:
        contexts = safe_eval(contexts)
    except Exception:
        logger.warning(f" in safe eval contexts: {contexts}")

    # context should be a list of strings as input and we transform it to a list of list of str because of ragas
    if isinstance(contexts, list):
        if isinstance(contexts[0], str):
            if isinstance(ground_truth, dict):
                # if the output is a json response, we will evaluate each element of the json response to each
                # element of the json ground_truth. For each element, we copy the contexts received for the whole json.
                contexts = [contexts for _ in range(len(ground_truth))]
            else:
                contexts = [contexts]
        elif isinstance(contexts[0], list) and isinstance(contexts[0][0], str):
            pass
        else:
            raise Exception(
                f"Value error in Context should be a list of strings. Context: {contexts}"
            )
    else:
        raise Exception(f"Value error in Context should be a list of strings. Context: {contexts}")

    # question should be an str and we transform it to a list of string because of ragas
    if isinstance(question, dict) and isinstance(
        list(question.values())[0], str
    ):  # format is {field: question}
        question = list(question.values())
    elif isinstance(question, str):
        question = [question]
    elif not isinstance(question, list):
        raise Exception(f"Value error in question: {question}")

    # ground_truth should be an str and we transform it to a list of string because of ragas
    if isinstance(ground_truth, dict) and isinstance(list(ground_truth.values())[0], str):
        ground_truth = list(ground_truth.values())
    elif isinstance(ground_truth, str):
        ground_truth = [ground_truth]
    elif not isinstance(ground_truth, list):
        raise Exception(f"Value error in ground_truth: {ground_truth}")

    # output should be an str and we transform it to a list of string because of ragas
    if isinstance(output, dict) and isinstance(list(output.values())[0], str):
        output = list(output.values())
    elif isinstance(output, str):
        output = [output]
    else:
        raise Exception(f"Value error in output: {output}")

    # check if all the lists have the same length
    lengths = [len(ground_truth), len(contexts), len(question), len(output)]
    if len(set(lengths)) != 1:
        raise Exception(
            f"Output, ground truth, contexts and question should have the same length : "
            f"len output {len(output)}, len ground_truth {len(ground_truth)}, len contexts {len(contexts)}, "
            f"len question {len(question)}"
        )

    return Dataset.from_dict(
        {
            "ground_truth": ground_truth,
            "answer": output,
            "contexts": contexts,
            "question": question,
        }
    )


def create_dynamic_model(input_dict: dict):
    fields = {
        i: (Optional[str], Field(default=None, description=question))
        for i, question in input_dict.items()
    }

    return create_model("DynamicModel", **fields)


def convert_to_json(output, context, threshold):
    try:
        if not isinstance(output, dict):
            llm_answer = json.loads(output)
        else:
            llm_answer = output
        true_answer = json.loads(context["vars"]["ground_truth"])
        return llm_answer, true_answer
    except Exception:
        score = 0
        return {
            "pass": score > threshold,
            "score": score,
            "reason": "answer or ground_truth is not a valid json to be used in this metric",
        }

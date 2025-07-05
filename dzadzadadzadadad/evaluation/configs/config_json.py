import json

from evaluation.metrics.utils import safe_eval
from utils import logger

logger.debug("Loading promptfoo_hooks.py")


def get_var(var_name, prompt, other_vars):
    """Function used by default by promptfoo call from the column 'context' of the dataset used in config_json.yml (test_json.csv).

    This function returns the context that will be used in the following call_api function
    The context can be. For example, the retrieved list of documents
    this is an example, and we will return the context that is defined in the csv file
    other_vars contains the vars of the csv file. prompt contains the prompt in the config_json.yml

    Args:
        prompt (str): The prompt used in the configuration file (prompts section of config_json.yml).
        other_vars (dict): A dictionary containing variables from a CSV file.

    """
    context = [
        "The USA Supreme Court ruling on abortion has sparked intense debates and discussions not only within the country but also around the world.",
        "Many countries look to the United States as a leader in legal and social issues, so the decision could potentially influence the policies and attitudes towards abortion in other nations.",
        "The ruling may impact international organizations and non-governmental groups that work on reproductive rights and women's health issues.",
    ]
    return {"output": json.dumps(context, ensure_ascii=False)}


def call_api(prompt, options, context) -> dict[str, str]:
    """Function used by default by promptfoo. Check the config_json.yml.

    Args:
        prompt (str): The prompt used in the configuration file (prompts section of config_json.yml).
        options:
        context (dict): A dictionary containing the other_vars and context return by the previous function get_var


    """
    query = safe_eval(context["vars"]["query"])
    output = {list(query.keys())[0]: "test"}
    result = {
        "output": json.dumps(output, ensure_ascii=False),
    }

    return result

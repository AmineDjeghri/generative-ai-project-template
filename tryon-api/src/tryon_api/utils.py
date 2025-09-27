import random
import numpy as np
import torch
import ast
import timeit


def set_seed(seed_value: int):
    """Sets the seed for torch, random, and numpy for reproducibility.

    This is called if a non-zero seed is provided for generation.
    """
    torch.manual_seed(seed_value)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed_value)
        torch.cuda.manual_seed_all(seed_value)  # if using multi-GPU
    random.seed(seed_value)
    np.random.seed(seed_value)


def get_device_type():
    return (
        "cuda"
        if torch.cuda.is_available()
        else "mps"
        if torch.backends.mps.is_available()
        else "cpu"
    )


def safe_eval(x):
    try:
        return ast.literal_eval(x)
    except:
        return []


def time_function(func):
    def wrapper(*args, **kwargs):
        start_time = timeit.default_timer()
        result = func(*args, **kwargs)

        end_time = timeit.default_timer()
        execution_time = round(end_time - start_time, 2)
        if result:
            if "reason" in result:
                result["reason"] = f" Execution time: {execution_time}s | " + result["reason"]

            if "output" in result:
                result["output"] = f" Execution time: {execution_time}s | " + result["output"]
            logger.debug(f"Function {func.__name__} took {execution_time} seconds to execute.")

        return result

    return wrapper

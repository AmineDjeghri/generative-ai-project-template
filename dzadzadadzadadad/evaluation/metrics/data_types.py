from typing import Optional

from pydantic import BaseModel


class GradingResult(BaseModel):
    pass_: bool  # 'pass' is a reserved keyword in Python
    score: float
    reason: str
    component_results: Optional[list["GradingResult"]] = None
    named_scores: Optional[dict[str, float]] = None  # Appear as metrics in the UI

from dataclasses import dataclass
from .Influence import Influence
from typing import Optional

@dataclass
class MoveResult:
    choice_to_remove: Optional[list[Influence]] = None
    exchange_choice: Optional[list[Influence]] = None



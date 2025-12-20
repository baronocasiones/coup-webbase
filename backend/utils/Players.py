from uuid import uuid4, UUID
from typing import List

class Players:
    def __init__(self, name):
        self.name: str = name
        self.id: UUID = uuid4()
        self.cards: List[str] = []
        self.coins: int = 2

    def change_name(self, new_name: str) -> None:
        self.name = new_name


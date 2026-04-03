from pydantic import BaseModel
from uuid import UUID


class PlayerModel(BaseModel):
    name: str
    id: UUID
    isReady: bool
    numberOfCards: int = 0
    coins: int

    class config:
        arbitrary_types_allowed = True
        extra = "ignore"

from pydantic import BaseModel
from uuid import UUID


class PlayerModel(BaseModel):
    name: str
    id: UUID
    isReady: bool
    numberOfCards: int = 0
    isLying: bool = False

    class config:
        extra = "ignore"

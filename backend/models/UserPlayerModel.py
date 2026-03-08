from pydantic import BaseModel
from services.Influence import Influence 
from uuid import UUID


class UserPlayerModel(BaseModel):
    name: str
    id: UUID
    coins: int
    cards: list[str]

    class config:
        arbitrary_types_allowed = True
        extra = "ignore"

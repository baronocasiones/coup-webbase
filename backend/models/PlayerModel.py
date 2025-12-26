from pydantic import BaseModel
from uuid import UUID

class PlayerModel(BaseModel):
    name: str
    id: UUID
    isReady: bool

    class config:
        extra = "ignore"



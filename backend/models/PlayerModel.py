from pydantic import BaseModel
from uuid import UUID

class PlayerModel(BaseModel):
    name: str
    id: UUID
    ready: bool = False



from pydantic import BaseModel

class PlayerModel(BaseModel):
    name: str
    id: Optional[UUID]
    ready: bool = False



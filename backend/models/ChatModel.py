from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class ChatModel(BaseModel):
    userId: UUID
    sender_username: str
    message: str
    timestamp: Optional[datetime] = datetime.now()

    class Config:
        frozen = True
        extra = "ignore"





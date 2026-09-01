from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ChatModel(BaseModel):
    userId: UUID
    sender_username: str
    message: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)

    class Config:
        frozen = True
        extra = "ignore"





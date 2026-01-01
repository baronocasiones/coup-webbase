from fastapi import APIRouter 
from utils.state import game
from models.ChatModel import ChatModel
from uuid import UUID

router = APIRouter()

@router.get("/chats", status_code=200, response_model=list[ChatModel])
def get_chats() -> list[ChatModel]:
    return game.chats

@router.post("/chat", status_code=201, response_model=list[ChatModel])
def add_chat(chat: ChatModel):
    game.add_chat(chat.model_dump())
    return game.chats



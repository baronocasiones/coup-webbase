from fastapi import APIRouter 
from utils.state import game
from models.ChatModel import ChatModel
from uuid import UUID
from controllers.LobbyController import lobby_controller

router = APIRouter()

@router.get("/chats", status_code=200, response_model=list[ChatModel])
def get_chats() -> list[ChatModel]:
    return lobby_controller.get_game_chats()

@router.post("/chat", status_code=201, response_model=list[ChatModel])
def add_chat(chat: ChatModel):
    lobby_controller.add_game_chat(chat.model_dump())
    return lobby_controller.get_game_chats()



from fastapi import APIRouter, HTTPException
from models.ChatModel import ChatModel
from controllers.LobbyController import lobby_controller
from utils.exceptions import SynchronizationError

router = APIRouter()


@router.get("/chats", status_code=200, response_model=list[ChatModel])
def get_chats() -> list[ChatModel]:
    return lobby_controller.get_game_chats()


@router.post("/chat", status_code=201, response_model=list[ChatModel])
def add_chat(chat: ChatModel):
    try:
        lobby_controller.add_game_chat(chat.model_dump())
    except SynchronizationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return lobby_controller.get_game_chats()



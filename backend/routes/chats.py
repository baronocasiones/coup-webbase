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
        # `mode="json"`, not the default python. The stored dict goes straight
        # onto a WebSocket by /ws/chat, where Starlette's `send_json` runs
        # `json.dumps` on it — and a raw `model_dump()` holds live `UUID` and
        # `datetime` objects that json cannot encode. That raised a TypeError
        # inside `broadcast()`, whose broad `except` then called `disconnect()`:
        # every message silently dropped the *recipient's* socket, so a player
        # watching chat was disconnected each time anyone joined the lobby. REST
        # never showed it, because the response model re-serialises the value.
        lobby_controller.add_game_chat(chat.model_dump(mode="json"))
    except SynchronizationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return lobby_controller.get_game_chats()



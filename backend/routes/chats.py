from fastapi import APIRouter, HTTPException
from models.ChatModel import ChatModel
from controllers.LobbyController import lobby_controller
from utils.exceptions import SynchronizationError

router = APIRouter()


@router.get("/chats", status_code=200, response_model=list[ChatModel])
def get_chats() -> list[ChatModel]:
    return lobby_controller.get_game_chats()


@router.post("/chat", status_code=201, response_model=list[ChatModel])
async def add_chat(chat: ChatModel):
    """
    Persist a message and push it to everyone else's chat socket.

    The broadcast lives here rather than behind the client's own WebSocket send
    because the write is the event. It used to depend on the sender's browser
    doing two things in the right order — POST, then send a frame — and if the
    socket was down, mid-handshake, or the POST resolved after the send, the
    message was saved and nobody else ever heard about it. Nothing reported
    that, because from the server's point of view the write had succeeded.

    Async because broadcasting is. The sender is excluded, matching the rest of
    the app: `ChatBox` refreshes its own list from the REST response, and
    including the sender would render the message twice.

    REST remains the only persistence path; the socket carries no authority.
    """
    try:
        # `mode="json"`, not the default python. The stored dict goes straight
        # onto a WebSocket, where Starlette's `send_json` runs `json.dumps` on it
        # — and a raw `model_dump()` holds live `UUID` and `datetime` objects
        # that json cannot encode. That raised a TypeError inside
        # `broadcast()`, whose broad `except` then called `disconnect()`: every
        # message silently dropped the *recipient's* socket, so a player watching
        # chat was disconnected each time anyone joined the lobby. REST never
        # showed it, because the response model re-serialises the value.
        lobby_controller.add_game_chat(chat.model_dump(mode="json"))
    except SynchronizationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Imported here, not at module scope: `api` imports this router, so a
    # top-level `from api import chat_manager` is a circular import. The manager
    # is a module-level singleton, so resolving it per call is equivalent and
    # costs a dict lookup.
    from api import chat_manager

    await chat_manager.broadcast(
        chat.userId, {"action": "chat", "messages": lobby_controller.get_game_chats()}
    )
    return lobby_controller.get_game_chats()



import logging
import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from controllers.LobbyController import lobby_controller
from controllers.GameController import game_controller
from utils.state import game
from utils.exceptions import PlayerNotFoundError
from logging_config import setup_logging

from services.ConnectionManager import ConnectionManager

from models.PlayerModel import PlayerModel
from models.ChatModel import ChatModel

from routes.players import router as players_router
from routes.chats import router as chats_router
from routes.game import router as game_router
from routes.auth import router as auth_router

setup_logging()
logger = logging.getLogger(__name__)

game_manager = ConnectionManager()
chat_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    lobby_controller.set_game(game)
    yield


app = FastAPI(lifespan=lifespan)

# CORS — allow Discord proxy origin + localhost for dev
DISCORD_PROXY_ORIGIN = os.environ.get("DISCORD_PROXY_ORIGIN", "")
origins = ["http://localhost:5173", "http://localhost:3000"]
if DISCORD_PROXY_ORIGIN:
    origins.append(DISCORD_PROXY_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(players_router)
app.include_router(chats_router)
app.include_router(game_router)
app.include_router(auth_router)


@app.get('/start-game')
def start_game():
    game_controller.set_game(game)
    game_controller.set_game_manager(game_manager)
    lobby_controller.start_game()


@app.get('/test/debug')
def debug_game():
    """Debug endpoint — shows full game state. Only for testing."""
    if os.environ.get("ENV") != "testing":
        raise HTTPException(status_code=403, detail="Not available")
    players = {str(k): v.name for k, v in game.players.items()}
    return {
        "game_id": str(game.game_id),
        "state": game.state.value,
        "players": players,
        "player_count": len(game.players),
        "lobby_game_id": str(lobby_controller.game.game_id) if lobby_controller.game else None,
        "gc_game_id": str(game_controller.game.game_id) if game_controller.game else None,
    }


@app.post('/test/reset')
def reset_game():
    """Reset game state. Only for testing — delegates to CoupGame.reset()."""
    if os.environ.get("ENV") != "testing":
        raise HTTPException(status_code=403, detail="Not available")

    # One definition, shared with conftest.py's autouse fixture, so the two
    # cannot drift. This used to re-list every field, which is how a field added
    # to CoupGame later leaked between tests unnoticed.
    game.reset()

    # Re-wire controllers
    lobby_controller.set_game(game)
    game_controller.game = None
    game_controller.game_manager = None

    # Clear WebSocket connection managers
    game_manager.active_connections.clear()
    chat_manager.active_connections.clear()

    return {"status": "ok"}


@app.websocket('/ws/lobby')
async def websocket_lobby_endpoint(websocket: WebSocket, user_id: UUID):
    # `get_player_by_id` *raises* `PlayerNotFoundError` for an unknown id rather
    # than returning None, so the `if player is None` check below used to be
    # dead code: the exception escaped first, and the endpoint produced an
    # unhandled server error instead of the 1008 close this contract documents.
    # It happened to still fail the handshake, so the tests asserting a rejected
    # connection passed either way and the difference was invisible.
    try:
        player = lobby_controller.get_player_by_id(user_id)
    except PlayerNotFoundError:
        await websocket.close(code=1008, reason="Invalid player ID")
        return

    players_state = [PlayerModel(**vars(player))
                     .model_dump(mode='json')
                     for player in lobby_controller.get_players()
                     ]

    await game_manager.connect(websocket, user_id, players_state)
    try:
        while True:
            # Expecting a list of player data
            data = json.loads(await websocket.receive_text())
            data_action = data.get("action", None)
            players_state = data.get("players", None)
            if data_action == "disconnect":
                game_manager.disconnect(user_id)
            await game_manager.broadcast(user_id, {'action': data_action, 'players': players_state})

    except WebSocketDisconnect as e:
        game_manager.disconnect(user_id)
        logger.warning("Lobby WS disconnect: %s", e)

    except Exception as e:
        logger.error("Lobby WS error: %s", e, exc_info=True)


@app.websocket('/ws/chat')
async def websocket_chat_endpoint(websocket: WebSocket, user_id: UUID):
    # Same dead branch as /ws/lobby: the lookup raises rather than returning
    # None, so the documented 1008 close never ran.
    try:
        player = lobby_controller.get_player_by_id(user_id)
    except PlayerNotFoundError:
        await websocket.close(code=1008, reason="Invalid player ID")
        return

    # `chats=`, by keyword, and carrying the finished frame rather than a bare
    # list. This used to pass the history positionally, into `players_state`, so
    # the chat log arrived wrapped in the *lobby player list* envelope —
    # {"action": "connect", "players": [...]} — and ChatBox stored that object
    # where it expected a list. The `chats` parameter had never been used by any
    # caller in the codebase.
    #
    # Note this reaches the *other* players, not the one connecting: `connect`
    # broadcasts with the sender excluded. That is harmless here because ChatBox
    # fetches the log over REST on mount, and the connecting client already has
    # it.
    await chat_manager.connect(
        websocket,
        user_id,
        chats={'action': 'chat', 'messages': lobby_controller.get_game_chats()},
    )
    try:
        while True:
            try:
                # Parsed only to reject malformed frames, not for its contents.
                # The stored log is the source of truth (REST is the sole
                # persistence path, per the project's chat convention), so the
                # body is advisory and the reply is re-read from the server.
                json.loads(await websocket.receive_text())
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON format"})
                continue

            # Re-read the log rather than relaying what the client sent. The
            # frame is now uniform: connect sends the whole list, and so does
            # every subsequent message, so the client has one shape to handle
            # instead of guessing from an object-vs-list distinction.
            await chat_manager.broadcast(
                user_id, {'action': 'chat', 'messages': lobby_controller.get_game_chats()}
            )

    except WebSocketDisconnect as e:
        chat_manager.disconnect(user_id)
        logger.warning("Chat WS disconnect: %s", e)

    except Exception as e:
        logger.error("Chat WS error: %s", e, exc_info=True)


# Serve built frontend in production — MUST be last (catch-all)
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")

import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from controllers.LobbyController import lobby_controller
from controllers.GameController import game_controller
from utils.state import game
from logging_config import setup_logging

from services.ConnectionManager import ConnectionManager

from models.PlayerModel import PlayerModel
from models.ChatModel import ChatModel

from routes.players import router as players_router
from routes.chats import router as chats_router
from routes.game import router as game_router

setup_logging()
logger = logging.getLogger(__name__)

game_manager = ConnectionManager()
chat_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    lobby_controller.set_game(game)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# routes
app.include_router(players_router)
app.include_router(chats_router)
app.include_router(game_router)


@app.get('/start-game')
def start_game():
    game_controller.set_game(game)
    game_controller.set_game_manager(game_manager)
    lobby_controller.start_game()


@app.get('/test/debug')
def debug_game():
    """Debug endpoint — shows full game state. Only for testing."""
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
    """Reset game state. Only for testing — must match conftest.py exactly."""
    from services.Card import Card
    from services.GameState import GameState

    # Reset the global game singleton
    game.court_deck = Card()
    game.players.clear()
    game.chats.clear()
    game.state = GameState.WAITING_FOR_PLAYERS
    game.declared_move = None
    game.declared_block = None
    game.blocker_id = None
    game.move_target_id = None
    game.challenge_loser = None
    game.pending_influence_target = None
    game.exchange_cards = None
    game.currentTurnIndex = 0
    game.challenger_id = None

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
    player = lobby_controller.get_player_by_id(user_id)
    player_name = player.name if player else None
    if player_name is None:
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
    player = lobby_controller.get_player_by_id(user_id)
    player_name = player.name if player else None
    if player_name is None:
        await websocket.close(code=1008, reason="Invalid player ID")
        return

    await chat_manager.connect(websocket, user_id, lobby_controller.get_game_chats())
    try:
        while True:
            try:
                message_data = json.loads(await websocket.receive_text())
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON format"})
                continue

            # Broadcast the raw message to all OTHER connected clients
            await chat_manager.broadcast(user_id, message_data)

    except WebSocketDisconnect as e:
        chat_manager.disconnect(user_id)
        logger.warning("Chat WS disconnect: %s", e)

    except Exception as e:
        logger.error("Chat WS error: %s", e, exc_info=True)

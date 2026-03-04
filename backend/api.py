from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware
from controllers.LobbyController import lobby_controller
from controllers.GameController import game_controller
from utils.state import game
import json

from services.ConnectionManager import ConnectionManager

from models.PlayerModel import PlayerModel
from models.ChatModel import ChatModel

from routes.players import router as players_router
from routes.chats import router as chats_router
from routes.game import router as game_router

game_manager = ConnectionManager()
chat_manager = ConnectionManager()

app = FastAPI()
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


@app.on_event('startup')
def startup_event():
    # BUG PRONE
    # might need to change when lobby is scaled up to multiple games
    lobby_controller.set_game(game)
    game_controller.set_game(game)
    return


@app.get('/start-game')
def start_game():
    lobby_controller.start_game()


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
        print(e)

    except Exception as e:
        print(f'Error: {e}')


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
                raise HTTPException(400, "Invalid JSON format")

            user_id_str = message_data.get("userId")
            if not user_id_str:
                raise HTTPException(400, "Unauthorized: Missing user_id")
            user_id = UUID(user_id_str)
            message_data['userId'] = user_id
            last_chat = lobby_controller.get_game_last_chat()
            if last_chat is not None and user_id != last_chat.get('userId') and message_data.get('message') != last_chat.get('message'):
                raise HTTPException(400, "SynchronizationError: Chat data is not updated")

            response = [ChatModel(**chat).model_dump(mode='json') for chat in lobby_controller.get_game_chats()]
            print("RESPONSE: ", response)
            await chat_manager.broadcast(user_id, response)

    except WebSocketDisconnect as e:
        chat_manager.disconnect(user_id)
        print(e)

    except Exception as e:
        print(f'Error: {e}')

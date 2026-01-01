from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from uuid import UUID
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from models.PlayerModel import PlayerModel
from models.GameStateModel import GameStateModel
from models.ChatModel import ChatModel
from services.ConnectionManager import ConnectionManager
from routes.players import router as players_router
from routes.chats import router as chats_router
from utils.state import game
import json

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


@app.websocket('/ws/lobby')
async def websocket_lobby_endpoint(websocket: WebSocket, user_id: UUID):
    player_obj = next(filter(lambda player: player.id == user_id, game.players), None)
    player_name = player_obj.name if player_obj else None
    players_state = [PlayerModel(
        name=player.name, 
        id=player.id,
        isReady=player.isReady
        ).model_dump(mode='json') for player in game.players]  
    if not player_name:
        await websocket.close(code=1008, reason="Invalid player ID")
        print("Invalid player ID")

    await game_manager.connect(websocket, user_id, players_state)
    try:
        while True:
            datas = json.loads(await websocket.receive_text()) # Expecting a list of player data
            data_action = datas.get("action", None)
            players_state = datas.get("players", None)
            if data_action == "disconnect":
                game_manager.disconnect(user_id)
            await game_manager.broadcast(user_id, players_state)

    except WebSocketDisconnect as e:
        game_manager.disconnect(user_id)

    except Exception as e:
        print(f'Error: {e}')

@app.websocket('/ws/chat')
async def websocket_chat_endpoint(websocket: WebSocket, user_id: UUID):
    player_obj = next(filter(lambda player: player.id == user_id, game.players), None)
    player_name = player_obj.name if player_obj else None
    if not player_name:
        await websocket.close(code=1008, reason="Invalid player ID")
        print("Invalid player ID")

    await chat_manager.connect(websocket, user_id, game.chats)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message = message_data.get("message", "")
            response = ChatModel(
                    userId=user_id,
                    username=player_name,
                    message=message
                    ).model_dump(mode='json')
            await chat_manager.broadcast(response)

    except WebSocketDisconnect as e:
        chat_manager.disconnect(user_id)

    except Exception as e:
        print(f'Error: {e}')

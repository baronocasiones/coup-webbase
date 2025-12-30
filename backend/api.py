from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from utils.CoupGame import CoupGame
from utils.Player import Player
from uuid import UUID
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from models.PlayerModel import PlayerModel
from models.GameStateModel import GameStateModel
from utils.ConnectionManager import ConnectionManager
import json

game = CoupGame()
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

@app.get("/players", response_model=list[PlayerModel])
def get_players():
    response = [PlayerModel(id=player.id, name=player.name, isReady=player.is_ready) for player in game.players]
    return response

@app.get("/player", response_model=list[PlayerModel])
def get_player(user_id: UUID):
    player = next(filter(lambda player: player.id == user_id, game.players), None)
    if player:
        response = PlayerModel(id=player.id, name=player.name, isReady=player.is_ready)
        return response
    return HTTPException(status_code=404, detail="Player not found")

@app.post("/player", response_model=PlayerModel)
def add_player(player_name: str):
    player = Player(player_name)
    game.add_player(player)
    response = PlayerModel(id=player.id, name=player.name, isReady=player.is_ready)
    return response
    
@app.delete("/player", response_model=list[PlayerModel])
def remove_player(user_id: UUID):
    game.update_players_state([player for player in game.players if player.id != user_id])
    response = [PlayerModel(id=player.id, name=player.name, isReady=player.is_ready) for player in game.players]
    return response

@app.websocket('/ws/lobby')
async def websocket_endpoint(websocket: WebSocket, player_id: UUID):
    player_obj = next(filter(lambda player: player.id == player_id, game.players), None)
    player_name = player_obj.name if player_obj else None
    players_state = [PlayerModel(
        name=player.name, 
        id=player.id,
        isReady=player.is_ready
        ).model_dump(mode='json') for player in game.players]  
    if not player_name:
        await websocket.close(code=1008, reason="Invalid player ID")
        print("Invalid player ID")

    await game_manager.connect(websocket, player_id, players_state)
    try:
        while True:
            datas = json.loads(await websocket.receive_text()) # Expecting a list of player data
            data_action = datas.get("action")
            response = None
            if data_action == "disconnect":
                 game_manager.disconnect(player_id)
                 response = players_state
            elif data_action == "ready":
                response = data.get("players", [])
            await game_manager.broadcast(player_id, response)

    except WebSocketDisconnect as e:
        game_manager.disconnect(player_id)

    except Exception as e:
        print(f'Error: {e}')

@app.websocket('/ws/lobbyChat')
async def lobby_chat(websocket: WebSocket, player_id: UUID):
    player_obj = next(filter(lambda player: player.id == player_id, game.players), None)
    player_name = player_obj.name if player_obj else None
    if not player_name:
        await websocket.close(code=1008, reason="Invalid player ID")
        return

    await chat_manager.connect(websocket, player_id, player_name)
    try:
        while True:
            data = await websocket.receive_text()
            await chat_manager.broadcast({"player": player_name, "message": data})

    except WebSocketDisconnect:
        chat_manager.disconnect(player_id)

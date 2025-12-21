from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from utils.CoupGame import CoupGame
from utils.Players import Players
from uuid import UUID
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from models.PlayerModel import PlayerModel
from models.GameStateModel import GameStateModel
from utils.ConnectionManager import ConnectionManager
import json

game = CoupGame()
manager = ConnectionManager()

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
    return game.players

@app.post("/player", response_model=PlayerModel)
def add_player(name: str):
    player = Players(name)
    game.add_player(player)
    return player
    
@app.delete("/player", response_model=list[PlayerModel])
def remove_player(user_id: UUID):
    game.players = [p for p in game.players if p.id != user_id]
    return game.players

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket, player_id: UUID):
    await manager.connect(websocket, player_id)
    try:
        while True:
            data = await websocket.receive_text()
            data_dict = json.loads(data)
            game_state = GameStateModel(**data_dict)
            await manager.broadcast(state.json())

    except WebSocketDisconnect:
        manager.disconnect(player_id)


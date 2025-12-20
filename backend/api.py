from fastapi import FastAPI
from utils.CoupGame import CoupGame
from utils.Players import Players
from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware

game = CoupGame()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlayerModel(BaseModel):
    name: str
    id: Optional[UUID]
    ready: bool = False

@app.get("/players", response_model=List[PlayerModel])
def get_players():
    return game.players

@app.post("/player", response_model=PlayerModel)
def add_player(name: str):
    player = Players(name)
    game.add_player(player)
    return player
    
@app.delete("/player", response_model=List[PlayerModel])
def remove_player(user_id: UUID):
    game.players = [p for p in game.players if p.id != user_id]
    return game.players

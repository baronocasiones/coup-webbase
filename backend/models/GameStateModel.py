from pydantic import BaseModel
from utils.Players import Players
from utils.GameState import GameState
from uuid import UUID
from typing import Optional

class GameStateModel(BaseModel):
    state: GameState
    players_state: list[dict[str, int | str]] 
    player_turn: Optional[UUID] = None
    declared_move: Optional[str] = None

    class Config:
        extra = "ignore"




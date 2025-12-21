from pydantic import BaseModel
from utils.Players import Players
from utils.GameState import GameState
from uuid import UUID

class GameStateModel(BaseModel):
    state: GameState
    players_state: list[dict[str, int | str]] 
    player_turn: UUID  
    declared_move: str = None



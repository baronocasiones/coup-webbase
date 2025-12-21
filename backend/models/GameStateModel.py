from pydantic import BaseModel
from utils.Players import Players
from utils.GameState import GameState

class GameStateModel(BaseModel):
    state: GameState
    players_state: list[dict[str, int | str]] 
    turn: Players 
    declared_move: str = None



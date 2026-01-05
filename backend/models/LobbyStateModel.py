from pydantic import BaseModel
from services.GameState import GameState
from uuid import UUID
from typing import Optional


class LobbyStateModel(BaseModel):
    state: GameState
    players_state: list[dict[str, int | str]]
    player_turn: Optional[UUID] = None
    declared_move: Optional[str] = None

    class Config:
        extra = "ignore"

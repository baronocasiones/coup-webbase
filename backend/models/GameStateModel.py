from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove

from pydantic import BaseModel
from models.PlayerModel import PlayerModel
from typing import Optional


class GameStateModel(BaseModel):
    state: GameState
    cardsInDeck: int
    playersState: list[PlayerModel]
    declaredMove: Optional[GameAction]
    declaredBlock: Optional[BlockMove]
    challengeLoser: Optional[PlayerModel]
    latestMove: Optional[str] = None
    currentTurn: PlayerModel

    class config:
        extra = 'ignore'

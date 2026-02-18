from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove
from services.Player import Player

from pydantic import BaseModel
from models.PlayerModel import LobbyPlayerModel
from typing import Optional


class GameStateModel(BaseModel):
    state: GameState
    cardsInDeck: int
    playersState: list[LobbyPlayerModel]
    delcaredMove: Optional[GameAction]
    declaredBlock: Optional[BlockMove]
    challengeLoser: Optional[Player]

    class config:
        extra = 'ignore'

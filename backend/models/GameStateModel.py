from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove

from pydantic import BaseModel
from models.PlayerModel import PlayerModel
from typing import Optional
from uuid import UUID


class GameStateModel(BaseModel):
    state: GameState
    cardsInDeck: int
    playersState: list[PlayerModel]
    declaredMove: Optional[GameAction]
    declaredBlock: Optional[BlockMove]
    challengeLoser: Optional[PlayerModel]
    latestMove: Optional[str] = None
    currentTurn: PlayerModel
    # Who declared the block, when `state` is BLOCK_DECLARED.
    #
    # This has to be public. During BLOCK_DECLARED, `currentTurn` is still the
    # player whose action was blocked — `currentTurnIndex` only moves in
    # next_turn() — so "is it my turn" cannot distinguish the actor (who
    # legally decides whether to challenge the block) from every other player.
    # Without this the client has no way to exclude the blocker, who must not
    # be able to resolve their own block. None outside BLOCK_DECLARED.
    blockerId: Optional[UUID] = None

    class config:
        extra = 'ignore'

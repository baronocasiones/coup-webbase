from pydantic import BaseModel
from uuid import UUID


class PlayerModel(BaseModel):
    name: str
    id: UUID
    isReady: bool
    numberOfCards: int = 0
    coins: int
    # Whether this player was knocked out of the game they just finished.
    #
    # Only ever set on the game-over standings. In a live game the roster holds
    # only survivors — `next_turn()` deletes a player the moment their last card
    # goes — so `playersState` can never show an eliminated player and their
    # `numberOfCards` of 0 is never observable. The standings are the one place
    # the losers still exist, and without this flag a hand of zero cards is the
    # only thing distinguishing them from the winner.
    isEliminated: bool = False

    class config:
        arbitrary_types_allowed = True
        extra = "ignore"

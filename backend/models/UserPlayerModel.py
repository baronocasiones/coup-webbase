from pydantic import BaseModel
from services.Influence import Influence 
from uuid import UUID
from typing import Optional


class UserPlayerModel(BaseModel):
    name: str
    id: UUID
    coins: int
    cards: list[str]
    # The full pool for an in-progress Exchange: the player's current cards
    # plus the two just drawn, in that order. Populated *only* for the player
    # whose turn is exchanging, and only while the state is PENDING_EXCHANGE.
    #
    # It lives on this private per-player model rather than on GameStateModel
    # because PlayerModel deliberately omits `cards` — the broadcast channel
    # is hand-blind by design, and the drawn cards are exactly as secret as
    # the cards already in hand. Putting them on the public state would make
    # every connected socket learn the result of every Exchange in the game.
    exchangeCards: Optional[list[str]] = None

    class config:
        arbitrary_types_allowed = True
        extra = "ignore"

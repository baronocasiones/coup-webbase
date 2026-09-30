from uuid import uuid4, UUID
from .GameAction import GameAction
from .Influence import Influence
from services.BlockMove import BlockMove
from utils.globals import STARTING_COINS


class Player:
    def __init__(self, name: str) -> None:
        self.name: str = name
        self.id: UUID = uuid4()
        self.cards: list[Influence] = []
        self.coins: int = STARTING_COINS
        self.isReady: bool = False
        self.moves: list[GameAction | BlockMove] = [
            GameAction.INCOME,
            GameAction.FOREIGN_AID,
            GameAction.COUP
        ]
        self.is_lying: bool = False
        self.numberOfCards: int

    def __eq__(self, other) -> bool:
        if not isinstance(other, Player):
            return NotImplemented
        return self.id == other.id

    def get_cards(self) -> list[Influence]:
        return self.cards

    def get_coins(self) -> int:
        return self.coins

    def add_card(self, card: Influence) -> None:
        self.moves.extend(card.get_actions())
        self.cards.append(card)
        self.numberOfCards = len(self.cards)

    def update_cards(self, new_cards: list[Influence]) -> None:
        self.cards = new_cards
        self.numberOfCards = len(self.cards)
        self._recalculate_moves()

    def _recalculate_moves(self) -> None:
        """Recalculate available moves from current cards."""
        self.moves = [
            GameAction.INCOME,
            GameAction.FOREIGN_AID,
            GameAction.COUP,
        ]
        for card in self.cards:
            self.moves.extend(card.get_actions())

    def reset(self) -> None:
        """
        Return this player to their state before the first hand was dealt.

        Used when a finished game goes back to the lobby for a rematch. Coins and
        cards are the game's own state; `moves` has to be recalculated rather
        than assigned, because an empty hand has to yield the three actions every
        player gets for free. Leaving a stale `moves` list here would hand the
        rematch's first player every action their previous hand granted.

        `id` is deliberately untouched: the client holds it in sessionStorage, so
        preserving it is what lets a rematch start without anyone re-registering.
        """
        self.cards = []
        self.numberOfCards = 0
        self.coins = STARTING_COINS
        self.isReady = False
        self.is_lying = False
        self._recalculate_moves()

    def toggle_ready(self) -> None:
        self.isReady = not self.isReady

    def change_name(self, new_name: str) -> None:
        self.name = new_name

    def remove_card(self, card_to_remove: Influence) -> None:
        if card_to_remove not in self.cards:
            raise ValueError(f"Card {card_to_remove} not found in player's cards.")
        self.cards.remove(card_to_remove)
        self.numberOfCards = len(self.cards)

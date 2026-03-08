from uuid import uuid4, UUID
from .GameAction import GameAction
from .Influence import Influence
from fastapi import WebSocket


class Player:
    def __init__(self, name: str) -> None:
        self.name: str = name
        self.id: UUID = uuid4()
        self.cards: list[Influence] = []
        self.coins: int = 2
        self.websocket: WebSocket
        self.isReady: bool = False
        self.moves: list[GameAction] = [
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

    def add_card(self, card: Influence) -> None:
        self.moves.extend(card.get_actions())
        self.cards.append(card)
        self.numberOfCards = len(self.cards)

    def update_cards(self, new_cards: list[Influence]) -> None:
        self.cards = new_cards
        self.numberOfCards = len(self.cards)

    def toggle_ready(self) -> None:
        self.isReady = not self.isReady

    def change_name(self, new_name: str) -> None:
        self.name = new_name

    def remove_card(self, card_to_remove: Influence) -> None:
        if card_to_remove not in self.cards:
            raise ValueError(f"Card {card_to_remove} not found in player's cards.")
        self.cards.remove(card_to_remove)
        self.numberOfCards = len(self.cards)

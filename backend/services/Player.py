from uuid import uuid4, UUID
from .GameAction import GameAction
from .Influence import Influence
from fastapi import WebSocket


class Player:
    def __init__(self, name):
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

    def __eq__(self, other) -> bool:
        if not isinstance(other, Player):
            return NotImplemented
        return self.id == other.id

    def get_cards(self) -> list[Influence]:
        return self.cards

    def add_card(self, card: Influence) -> None:
        self.moves.extend(card.get_actions())
        self.cards.append(card)

    def update_cards(self, new_cards: list[Influence]) -> None:
        self.cards = new_cards

    def toggle_ready(self) -> None:
        self.isReady = not self.isReady

    def change_name(self, new_name: str) -> None:
        self.name = new_name

    def remove_card(self, card_index: int) -> None:
        """
        Removes a card at the specified index from the player's hand,
        and removes all associated actions from the player's available moves.
        Raises IndexError if the index is out of range.
        """
        if 0 <= card_index < len(self.cards):
            influence = self.cards[card_index]
            influence_actions = influence.get_actions()
            # Use set operations for efficient removal
            self.moves = [
                    action for action in
                    self.moves if action not in influence_actions
                    ]
            self.cards.pop(card_index)
        else:
            raise IndexError("Index given is out of card range")

from uuid import uuid4, UUID
from .GameActions import GameActions
from .Influence import Influence

class Player:
    def __init__(self, name):
        self.name: str = name
        self.id: UUID = uuid4()
        self.cards: list[Influence] = []
        self.coins: int = 2
        self.websocket: WebSocket
        self.isReady: bool = False
        self.moves: list[GameActions] = [
                GameActions.INCOME,
                GameActions.FOREIGN_AID,
                GameActions.COUP
                ]
        self.is_lying: bool = False

    def toggle_ready(self) -> None:
        self.isReady = not self.isReady

    def change_name(self, new_name: str) -> None:
        self.name = new_name

    def add_card(self, card: Influence) -> None:
        self.moves.extend(card.get_actions())
        self.cards.append(card)

    def remove_card(self, card_index: int) -> None:
        if 0 <= card_index < len(self.cards):
            self.cards.pop(card_index)


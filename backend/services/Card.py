from .Influence import Influence
from collections import deque
import random


class Card:
    def __init__(self):
        cards = []
        for influence in Influence:
            for _ in range(3):
                cards.append(influence)
        random.shuffle(cards)
        self.card_stack: deque[Influence] = deque(cards)

    def draw_card(self) -> Influence | None:
        """Draw a card from the top (right end) of the deck."""
        if self.card_stack:
            return self.card_stack.pop()
        return None

    def return_card(self, card: Influence) -> None:
        """Return a card to the bottom (left end) of the deck."""
        self.card_stack.appendleft(card)

    def shuffle_deck(self) -> None:
        """Shuffle the deck."""
        cards = list(self.card_stack)
        random.shuffle(cards)
        self.card_stack = deque(cards)

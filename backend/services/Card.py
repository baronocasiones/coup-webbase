from .Influence import Influence
import random

class Card:
    def __init__(self):
        self.card_stack = []
        for influence in Influence:
            for _ in range(3):  # Assuming 3 copies of each card
                self.card_stack.append(influence)

        random.shuffle(self.card_stack)

    def draw_card(self) -> Influence | None:
        if self.card_stack:
            return self.card_stack.pop()
        else:
            return None

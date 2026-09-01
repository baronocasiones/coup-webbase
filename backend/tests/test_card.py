import pytest
from collections import deque
from services.Card import Card
from services.Influence import Influence


pytestmark = pytest.mark.unit

def test_card_initialization():
    card = Card()
    # There should be 3 copies of each Influence in the deck
    influences = [influence for influence in Influence]
    counts = {influence: 0 for influence in influences}
    for c in card.card_stack:
        counts[c] += 1
    for influence in influences:
        assert counts[influence] == 3

def test_draw_card_reduces_stack():
    card = Card()
    initial_len = len(card.card_stack)
    drawn = card.draw_card()
    assert drawn in Influence
    assert len(card.card_stack) == initial_len - 1

def test_draw_card_empty_returns_none():
    card = Card()
    # Draw all cards
    for _ in range(len(card.card_stack)):
        card.draw_card()
    assert card.draw_card() is None

def test_return_card_adds_to_stack():
    card = Card()
    drawn = card.draw_card()
    initial_len = len(card.card_stack)
    card.return_card(drawn)
    assert len(card.card_stack) == initial_len + 1
    assert card.card_stack[0] == drawn

def test_shuffle_deck_changes_order():
    card = Card()
    original_order = card.card_stack.copy()
    card.shuffle_deck()
    # It's possible the order doesn't change, but very unlikely
    assert card.card_stack != original_order or len(set(card.card_stack)) == 1


class TestCardEdgeCases:
    def test_deck_is_deque(self):
        """Card stack should be a deque for O(1) operations."""
        card = Card()
        assert isinstance(card.card_stack, deque)

    def test_deck_total_card_count(self):
        """Deck should have 15 cards (3 of each of 5 influences)."""
        card = Card()
        assert len(card.card_stack) == 15

    def test_draw_returns_valid_influence(self):
        """Every drawn card should be a valid Influence member."""
        card = Card()
        for _ in range(15):
            drawn = card.draw_card()
            assert isinstance(drawn, Influence)

    def test_draw_and_return_preserves_count(self):
        """Drawing then returning should preserve total count."""
        card = Card()
        initial = len(card.card_stack)
        drawn = card.draw_card()
        card.return_card(drawn)
        assert len(card.card_stack) == initial

    def test_return_card_adds_to_bottom(self):
        """return_card should add to the left end (bottom) of the deque."""
        card = Card()
        # Draw a known card
        card.card_stack.clear()
        card.card_stack.extend([Influence.DUKE, Influence.ASSASSIN])
        card.return_card(Influence.CONTESSA)
        # CONTESSA should be at index 0 (bottom)
        assert card.card_stack[0] == Influence.CONTESSA
        assert card.card_stack[-1] == Influence.ASSASSIN

    def test_draw_from_top(self):
        """draw_card should pop from the right end (top) of the deque."""
        card = Card()
        card.card_stack.clear()
        card.card_stack.extend([Influence.DUKE, Influence.ASSASSIN, Influence.CONTESSA])
        drawn = card.draw_card()
        assert drawn == Influence.CONTESSA
        assert len(card.card_stack) == 2

    def test_lifo_after_return(self):
        """Card returned to bottom should be drawn last (LIFO for bottom)."""
        card = Card()
        card.card_stack.clear()
        card.card_stack.extend([Influence.DUKE, Influence.ASSASSIN])
        card.return_card(Influence.CONTESSA)
        # Draw all: should get ASSASSIN, DUKE, then CONTESSA
        assert card.draw_card() == Influence.ASSASSIN
        assert card.draw_card() == Influence.DUKE
        assert card.draw_card() == Influence.CONTESSA

    def test_shuffle_preserves_card_count(self):
        """Shuffle should not change the number of cards."""
        card = Card()
        initial = len(card.card_stack)
        card.shuffle_deck()
        assert len(card.card_stack) == initial

    def test_shuffle_preserves_card_contents(self):
        """Shuffle should preserve the set of cards."""
        card = Card()
        before = set(card.card_stack)
        card.shuffle_deck()
        after = set(card.card_stack)
        assert before == after

    def test_draw_all_then_return_all(self):
        """Draw all cards, return them, deck should be full again."""
        card = Card()
        drawn = []
        for _ in range(15):
            drawn.append(card.draw_card())
        assert len(card.card_stack) == 0

        for c in drawn:
            card.return_card(c)
        assert len(card.card_stack) == 15

    def test_return_card_to_empty_deck(self):
        """Returning a card to an empty deck should work."""
        card = Card()
        card.card_stack.clear()
        card.return_card(Influence.DUKE)
        assert len(card.card_stack) == 1
        assert card.card_stack[0] == Influence.DUKE

    def test_multiple_shuffles(self):
        """Multiple shuffles should not corrupt the deck."""
        card = Card()
        for _ in range(10):
            card.shuffle_deck()
        assert len(card.card_stack) == 15

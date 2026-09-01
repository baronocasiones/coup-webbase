import pytest
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

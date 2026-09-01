import pytest
from uuid import UUID
from services.Player import Player
from services.GameAction import GameAction
from services.Influence import Influence
from services.BlockMove import BlockMove


pytestmark = pytest.mark.unit

class DummyInfluence:
    def get_actions(self):
        return [GameAction.INCOME]

def test_player_initialization():
    player = Player("Alice")
    assert player.name == "Alice"
    assert isinstance(player.id, UUID)
    assert player.coins == 2
    assert player.cards == []
    assert player.isReady is False
    assert GameAction.INCOME in player.moves
    assert GameAction.FOREIGN_AID in player.moves
    assert GameAction.COUP in player.moves

def test_add_card():
    player = Player("Bob")
    card = DummyInfluence()
    player.add_card(card)
    assert card in player.cards
    assert GameAction.INCOME in player.moves

def test_update_cards():
    player = Player("Carol")
    card1 = DummyInfluence()
    card2 = DummyInfluence()
    player.add_card(card1)
    player.update_cards([card2])
    assert player.cards == [card2]

def test_toggle_ready():
    player = Player("Dave")
    assert not player.isReady
    player.toggle_ready()
    assert player.isReady
    player.toggle_ready()
    assert not player.isReady

def test_change_name():
    player = Player("Eve")
    player.change_name("Eva")
    assert player.name == "Eva"

def test_equality():
    player1 = Player("Frank")
    player2 = Player("Frank")
    assert player1 != player2
    player2.id = player1.id
    assert player1 == player2

def test_remove_card_success():
    player = Player("Grace")
    card = DummyInfluence()
    player.add_card(card)
    player.remove_card(card)
    assert card not in player.cards

def test_remove_card_failure():
    player = Player("Heidi")
    card = DummyInfluence()
    with pytest.raises(ValueError):
        player.remove_card(card)


class TestPlayerEdgeCases:
    def test_update_cards_empty_list(self):
        """Updating cards with empty list clears cards and recalculates moves."""
        player = Player("Test")
        player.add_card(DummyInfluence())
        player.update_cards([])
        assert player.cards == []
        assert player.numberOfCards == 0
        # Base moves should remain
        assert GameAction.INCOME in player.moves
        assert GameAction.FOREIGN_AID in player.moves
        assert GameAction.COUP in player.moves

    def test_update_cards_with_duplicates(self):
        """Updating cards with duplicates should work (player gets duplicate cards)."""
        player = Player("Test")
        card = Influence.DUKE
        player.update_cards([card, card])
        assert len(player.cards) == 2
        assert player.cards[0] == Influence.DUKE
        assert player.cards[1] == Influence.DUKE

    def test_update_cards_recalculates_moves(self):
        """update_cards should recalculate available moves from new cards."""
        player = Player("Test")
        # Start with no cards — only base moves
        assert GameAction.TAX not in player.moves
        # Give Duke
        player.update_cards([Influence.DUKE])
        assert GameAction.TAX in player.moves
        assert BlockMove.BLOCK_FOREIGN_AID in player.moves

    def test_remove_card_updates_number_of_cards(self):
        """remove_card should update numberOfCards."""
        player = Player("Test")
        player.cards = [Influence.DUKE, Influence.ASSASSIN]
        player.numberOfCards = 2
        player.remove_card(Influence.DUKE)
        assert player.numberOfCards == 1

    def test_remove_card_does_not_recalculate_moves(self):
        """remove_card only removes the card, does not recalculate moves."""
        player = Player("Test")
        # Use add_card to properly set up moves
        player.add_card(Influence.DUKE)
        player.add_card(Influence.ASSASSIN)
        # After add_card, TAX and ASSASSINATE should be in moves
        assert GameAction.TAX in player.moves
        assert GameAction.ASSASSINATE in player.moves
        # Remove Duke — TAX should still be in moves (remove_card doesn't recalculate)
        player.remove_card(Influence.DUKE)
        assert GameAction.TAX in player.moves

    def test_equality_with_non_player(self):
        """Comparing Player with non-Player returns NotImplemented."""
        player = Player("Test")
        result = player.__eq__("not a player")
        assert result is NotImplemented

    def test_add_card_increments_number_of_cards(self):
        """add_card should increment numberOfCards."""
        player = Player("Test")
        player.add_card(Influence.DUKE)
        assert player.numberOfCards == 1
        player.add_card(Influence.ASSASSIN)
        assert player.numberOfCards == 2

    def test_get_cards_returns_same_reference(self):
        """get_cards returns the same list object."""
        player = Player("Test")
        player.cards = [Influence.DUKE]
        assert player.get_cards() is player.cards

    def test_get_coins_returns_coins(self):
        """get_coins returns the coin count."""
        player = Player("Test")
        player.coins = 5
        assert player.get_coins() == 5

    def test_change_name_to_empty_string(self):
        """change_name allows empty string."""
        player = Player("Test")
        player.change_name("")
        assert player.name == ""

    def test_multiple_toggle_ready(self):
        """Multiple toggles should flip correctly."""
        player = Player("Test")
        for _ in range(10):
            player.toggle_ready()
        assert player.isReady is False
        player.toggle_ready()
        assert player.isReady is True

import pytest
from uuid import UUID
from services.Player import Player
from services.GameAction import GameAction
from services.Influence import Influence


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

import pytest
from uuid import UUID

from services.Player import Player
from services.GameAction import GameAction
from services.Influence import Influence

class DummyInfluence:
    def get_actions(self):
        return [GameAction.INCOME, GameAction.FOREIGN_AID]

@pytest.fixture
def player():
    return Player("Alice")

def test_player_initialization(player):
    assert player.name == "Alice"
    assert isinstance(player.id, UUID)
    assert player.cards == []
    assert player.coins == 2
    assert player.isReady is False
    assert player.moves == [GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP]
    assert player.is_lying is False

def test_toggle_ready(player):
    player.toggle_ready()
    assert player.isReady is True
    player.toggle_ready()
    assert player.isReady is False

def test_change_name(player):
    player.change_name("Bob")
    assert player.name == "Bob"

def test_add_card(player):
    card = DummyInfluence()
    player.add_card(card)
    assert card in player.cards
    assert GameAction.INCOME in player.moves
    assert GameAction.FOREIGN_AID in player.moves

def test_remove_card(player):
    card = DummyInfluence()
    player.add_card(card)
    player.remove_card(0)
    assert card not in player.cards

def test_equality(player):
    player2 = Player("Alice")
    player2.id = player.id
    assert player == player2
    player3 = Player("Bob")
    assert player != player3

import pytest
from uuid import uuid4
from unittest.mock import MagicMock

from services.CoupGame import CoupGame
from services.GameState import GameState
from services.Player import Player
from services.GameAction import GameAction
from utils.exceptions import SynchronizationError

@pytest.fixture
def game():
    game = CoupGame()
    player1 = MagicMock(spec=Player)
    player2 = MagicMock(spec=Player)
    player1.id = uuid4()
    player2.id = uuid4()
    game.players = [player1, player2]
    game.current_player_index = 0
    return game

def test_add_chat(game):
    chat1 = {"message": "hi", "timestamp": 1}
    chat2 = {"message": "hello", "timestamp": 2}
    game.add_chat(chat1)
    game.add_chat(chat2)
    assert len(game.chats) == 2
    with pytest.raises(SynchronizationError):
        game.add_chat({"message": "old", "timestamp": 0})

def test_update_players_state(game):
    new_player = MagicMock(spec=Player)
    new_player.id = game.players[0].id
    game.update_players_state(update_player=new_player)
    assert new_player in game.players

def test_get_player(game):
    found = game.get_player(game.players[0].id)
    assert found == game.players[0]
    with pytest.raises(ValueError):
        game.get_player(uuid4())

def test_declare_move_wrong_state(game):
    game.state = GameState.WAITING_FOR_PLAYERS
    with pytest.raises(SynchronizationError):
        game.declare_move(game.players[0].id, GameAction.INCOME)

def test_declare_move_not_players_turn(game):
    game.state = GameState.WAITING_FOR_ACTION
    game.current_player_index = 1
    with pytest.raises(SynchronizationError):
        game.declare_move(game.players[0].id, GameAction.INCOME)

def test_next_turn(game):
    game.current_player_index = 0
    game.next_turn()
    assert game.current_player_index == 1
    assert game.state == GameState.WAITING_FOR_ACTION

def test_next_turn(game):
    game.current_player_index = 0
    game.next_turn()
    assert game.current_player_index == 1
    assert game.state == GameState.WAITING_FOR_ACTION

    def test_next_turn(self):
        self.game.current_player_index = 0
        self.game.next_turn()
        self.assertEqual(self.game.current_player_index, 1)
        self.assertEqual(self.game.state, GameState.WAITING_FOR_ACTION)

if __name__ == '__main__':
    unittest.main()

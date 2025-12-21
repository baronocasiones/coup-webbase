import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.CoupGame import CoupGame
from utils.Players import Players
from utils.GameState import GameState
from exceptions import PlayerInsufficientError


def test_add_player():
    game = CoupGame()
    player1 = Players("Alice")
    player2 = Players("Bob")
    
    game.add_player(player1)
    game.add_player(player2)
    
    assert len(game.players) == 2
    assert game.players[0].name == "Alice"
    assert game.players[1].name == "Bob"


def test_initial_game_state():
    game = CoupGame()
    
    assert game.state.name is GameState.WAITING_FOR_PLAYERS
    assert game.turn == 0
    assert game.declared_move == ""
    assert len(game.players) == 0

def test_start_game():
    game = CoupGame()
    player1 = Players("Alice")
    player2 = Players("Bob")
    player3 = Players("Charlie")
    
    game.add_player(player1)
    game.add_player(player2)
    game.add_player(player3)
    
    game.start_game()
    
    assert game.state is GameState.WAITING_FOR_ACTION
    assert game.turn == 0  

    with pytest.raises(PlayerInsufficientError, match="Not enough players to start the game. Minimum 2 players required."):
        game_insufficient = CoupGame()
        player1 = Players("Alice")
        game_insufficient.add_player(player1)
        game_insufficient.start_game()

def test_handle_move():
    game = CoupGame()
    player1 = Players("Alice")
    player2 = Players("Bob")
    player3 = Players("Charlie")
    
    game.add_player(player1)
    game.add_player(player2)
    game.add_player(player3)
    
    game.start_game()
    
    current_player = game.players[game.turn]
    move = "Income"
    
    game.handle_move(current_player.id, move)
    
    assert game.declared_move == move
    assert game.state is GameState.ACTION_DECLARED

def test_handle_challenge():
    game = CoupGame()
    player1 = Players("Alice")
    player2 = Players("Bob")
    player3 = Players("Charlie")
    
    game.add_player(player1)
    game.add_player(player2)
    game.add_player(player3)
    
    game.start_game()
    
    current_player = game.players[game.turn]
    move = "Assassinate"
    
    game.handle_move(current_player.id, move)
    
    challenger = game.players[(game.turn + 1) % len(game.players)]
    game.handle_challenge(challenger.id)
    
    assert game.state is GameState.CHALLENGE_HANDLE


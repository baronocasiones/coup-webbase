import pytest
from uuid import uuid4
from services.Player import Player
from services.CoupGame import CoupGame
from services.GameState import GameState
from controllers.GameController import GameController
from utils.exceptions import SynchronizationError


@pytest.fixture
def game_controller():
    """Create a fresh GameController with a game instance."""
    controller = GameController()
    game = CoupGame()
    controller.set_game(game)
    return controller


@pytest.fixture
def setup_game_with_players():
    """Create a game with multiple players ready to play."""
    controller = GameController()
    game = CoupGame()
    controller.set_game(game)
    
    # Add players
    player1 = Player("Alice")
    player2 = Player("Bob")
    game.add_player(player1)
    game.add_player(player2)
    
    # Start game
    game.start_game()
    
    return controller, game, player1, player2


class TestGameControllerSetup:
    """Test GameController setup and initialization."""

    def test_set_game(self):
        """Test setting a game in controller."""
        controller = GameController()
        game = CoupGame()
        controller.set_game(game)
        assert controller.game == game

    def test_get_game_states_initial(self, game_controller):
        """Test getting initial game state."""
        states = game_controller.get_game_states()
        assert states is not None
        assert "state" in states


class TestGameControllerPlayerRetrieval:
    """Test player retrieval functionality."""

    def test_get_player_by_id(self, setup_game_with_players):
        """Test getting a player by ID."""
        controller, game, player1, player2 = setup_game_with_players
        retrieved_player = controller.get_player_by_id(player1.id)
        assert retrieved_player.name == "Alice"
        assert retrieved_player.id == player1.id

    def test_get_player_by_id_not_found(self, game_controller):
        """Test getting non-existent player."""
        result = game_controller.get_player_by_id(uuid4())
        assert result is None

    def test_get_all_players(self, setup_game_with_players):
        """Test retrieving all players in game."""
        controller, game, player1, player2 = setup_game_with_players
        players = controller.game.get_players()
        assert len(players) == 2
        assert player1 in players
        assert player2 in players


class TestGameControllerGameStates:
    """Test game state retrieval and transitions."""

    def test_get_game_states(self, game_controller):
        """Test retrieving game states."""
        states = game_controller.get_game_states()
        assert states is not None
        # Should contain game state information
        assert "state" in states or "players" in states or "game_id" in states

    def test_game_state_after_start(self, setup_game_with_players):
        """Test game state after starting."""
        controller, game, _, _ = setup_game_with_players
        states = controller.get_game_states()
        # Game should be in WAITING_FOR_ACTION state after start
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_current_turn_index_accessible(self, setup_game_with_players):
        """Test that current turn index is accessible."""
        controller, game, _, _ = setup_game_with_players
        assert game.currentTurnIndex == 0


class TestGameControllerMoveDecleration:
    """Test move declaration functionality."""

    def test_declare_move_sets_declared_move(self, setup_game_with_players):
        """Test that declaring a move sets the move."""
        from services.GameAction import GameAction
        controller, game, player1, player2 = setup_game_with_players
        
        # First player declares income
        controller.declare_move(player1.id, GameAction.INCOME)
        
        # After income (which executes immediately), it should be next player's turn
        assert game.currentTurnIndex == 1

    def test_declare_move_wrong_player(self, setup_game_with_players):
        """Test declaring move when it's not your turn."""
        from services.GameAction import GameAction
        from utils.exceptions import SynchronizationError
        controller, game, player1, player2 = setup_game_with_players
        
        # Try to make a move when it's not player2's turn
        with pytest.raises(SynchronizationError):
            controller.declare_move(player2.id, GameAction.INCOME)


class TestGameControllerGameManager:
    """Test game manager functionality."""

    def test_set_game_manager(self, game_controller):
        """Test setting game manager."""
        from services.ConnectionManager import ConnectionManager
        manager = ConnectionManager()
        game_controller.set_game_manager(manager)
        assert game_controller.game_manager == manager

    def test_game_manager_accessible(self, game_controller):
        """Test that game manager is accessible."""
        assert hasattr(game_controller, 'game_manager')


class TestGameControllerIntegration:
    """Integration tests for GameController."""

    def test_complete_game_flow_single_move(self, setup_game_with_players):
        """Test a complete game flow with a single move."""
        from services.GameAction import GameAction
        controller, game, player1, player2 = setup_game_with_players
        
        # Player 1 gets coins before move
        player1_coins_before = player1.coins
        
        # Player 1 declares income
        controller.declare_move(player1.id, GameAction.INCOME)
        
        # Player 1 should have more coins
        assert player1.coins == player1_coins_before + 1
        
        # Should be player 2's turn
        assert game.currentTurnIndex == 1

    def test_multiple_turns(self, setup_game_with_players):
        """Test multiple turns in sequence."""
        from services.GameAction import GameAction
        controller, game, player1, player2 = setup_game_with_players
        
        initial_coins_p1 = player1.coins
        initial_coins_p2 = player2.coins
        
        # Player 1 declares income
        controller.declare_move(player1.id, GameAction.INCOME)
        assert player1.coins == initial_coins_p1 + 1
        
        # Player 2 declares income
        controller.declare_move(player2.id, GameAction.INCOME)
        assert player2.coins == initial_coins_p2 + 1
        
        # Should be back to player 1's turn
        assert game.currentTurnIndex == 0

    def test_player_cards_persist_across_turns(self, setup_game_with_players):
        """Test that player cards persist across turns."""
        from services.GameAction import GameAction
        controller, game, player1, player2 = setup_game_with_players
        
        initial_p1_cards = len(player1.cards)
        initial_p2_cards = len(player2.cards)
        
        # Play a couple of turns
        controller.declare_move(player1.id, GameAction.INCOME)
        controller.declare_move(player2.id, GameAction.INCOME)
        
        # Cards should remain the same
        assert len(player1.cards) == initial_p1_cards
        assert len(player2.cards) == initial_p2_cards

    def test_game_state_accessible(self, setup_game_with_players):
        """Test that game state is accessible after moves."""
        from services.GameAction import GameAction
        controller, game, player1, player2 = setup_game_with_players
        
        assert game.state == GameState.WAITING_FOR_ACTION
        
        controller.declare_move(player1.id, GameAction.INCOME)
        
        # Should still be waiting for action (income executes immediately)
        assert game.state == GameState.WAITING_FOR_ACTION


class TestGameControllerErrorHandling:
    """Test error handling in GameController."""

    def test_no_game_set_get_states(self):
        """Test getting states when no game is set."""
        controller = GameController()
        with pytest.raises(AttributeError):
            controller.get_game_states()

    def test_no_game_set_get_player(self):
        """Test getting player when no game is set."""
        controller = GameController()
        with pytest.raises(AttributeError):
            controller.get_player_by_id(uuid4())

    def test_no_game_set_declare_move(self):
        """Test declaring move when no game is set."""
        from services.GameAction import GameAction
        controller = GameController()
        with pytest.raises(AttributeError):
            controller.declare_move(uuid4(), GameAction.INCOME)

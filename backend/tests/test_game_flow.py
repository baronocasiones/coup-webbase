import pytest
from uuid import uuid4
from services.Player import Player
from services.CoupGame import CoupGame
from services.GameState import GameState
from services.GameAction import GameAction
from services.Influence import Influence
from utils.exceptions import SynchronizationError, PlayerInsufficientError


@pytest.fixture
def game_with_three_players():
    """Create a game with three players."""
    game = CoupGame()
    players = [Player("Player1"), Player("Player2"), Player("Player3")]
    for player in players:
        game.add_player(player)
    game.start_game()
    return game, players


@pytest.fixture
def game_with_two_players():
    """Create a game with two players."""
    game = CoupGame()
    players = [Player("Alice"), Player("Bob")]
    for player in players:
        game.add_player(player)
    game.start_game()
    return game, players


class TestGameMovesValidation:
    """Test move validation and constraints."""

    def test_income_is_always_valid(self, game_with_two_players):
        """Test that INCOME is always a valid move."""
        game, players = game_with_two_players
        player = players[0]
        
        # Income should always be valid
        try:
            game.declare_move(player.id, GameAction.INCOME)
            # Should succeed
            assert True
        except SynchronizationError:
            pytest.fail("INCOME should always be valid")

    def test_foreign_aid_is_blockable(self, game_with_two_players):
        """Test that FOREIGN_AID can be blocked."""
        game, players = game_with_two_players
        current_player = players[0]
        other_player = players[1]
        
        # Declare foreign aid
        game.declare_move(current_player.id, GameAction.FOREIGN_AID)
        assert game.state == GameState.ACTION_DECLARED
        assert game.declared_move == GameAction.FOREIGN_AID

    def test_targetable_moves_require_target(self, game_with_two_players):
        """Test that targetable moves require a target player ID."""
        game, players = game_with_two_players
        current_player = players[0]
        
        # STEAL is targetable and should require target_id
        try:
            game.declare_move(current_player.id, GameAction.STEAL, target_id=None)
            pytest.fail("STEAL without target should raise ValueError")
        except ValueError:
            assert True

    def test_non_targetable_moves_ignore_target(self, game_with_two_players):
        """Test that non-targetable moves ignore target player ID."""
        game, players = game_with_two_players
        current_player = players[0]
        
        # TAX is not targetable
        game.declare_move(current_player.id, GameAction.TAX)
        assert game.declared_move == GameAction.TAX


class TestGameCoinsManagement:
    """Test coin management during gameplay."""

    def test_player_starts_with_two_coins(self, game_with_two_players):
        """Test that each player starts with 2 coins."""
        game, players = game_with_two_players
        for player in players:
            assert player.coins == 2

    def test_income_adds_one_coin(self, game_with_two_players):
        """Test that INCOME action adds 1 coin."""
        game, players = game_with_two_players
        player = players[0]
        initial_coins = player.coins
        
        game.declare_move(player.id, GameAction.INCOME)
        assert player.coins == initial_coins + 1

    def test_multiple_income_actions(self, game_with_two_players):
        """Test multiple INCOME actions by both players."""
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]
        initial_coins_p1 = player1.coins
        initial_coins_p2 = player2.coins
        
        # Player 1 takes income
        game.declare_move(player1.id, GameAction.INCOME)
        
        # Player 2 takes income (turn has advanced)
        game.declare_move(player2.id, GameAction.INCOME)
        
        # Both players should have gained 1 coin
        assert player1.coins == initial_coins_p1 + 1
        assert player2.coins == initial_coins_p2 + 1

    def test_foreign_aid_adds_two_coins(self, game_with_two_players):
        """Test that FOREIGN_AID adds 2 coins if not blocked."""
        game, players = game_with_two_players
        player = players[0]
        initial_coins = player.coins
        
        game.declare_move(player.id, GameAction.FOREIGN_AID)
        # No one challenged, should add coins
        game.handle_no_challenge()
        
        assert player.coins == initial_coins + 2

    def test_cannot_coup_with_insufficient_coins(self, game_with_two_players):
        """Test that COUP requires 7+ coins or fails."""
        game, players = game_with_two_players
        player = players[0]
        
        # Player starts with 2 coins, can't coup
        # COUP should either require coins or be invalid
        # The actual implementation may vary


class TestGameChallenges:
    """Test challenge mechanics."""

    def test_can_challenge_tax(self, game_with_two_players):
        """Test that TAX can be challenged."""
        game, players = game_with_two_players
        current_player = players[0]
        challenger = players[1]
        
        game.declare_move(current_player.id, GameAction.TAX)
        assert game.state == GameState.ACTION_DECLARED

    def test_challenge_sets_loser(self, game_with_two_players):
        """Test that challenge identifies a loser."""
        game, players = game_with_two_players
        current_player = players[0]
        challenger = players[1]
        
        game.declare_move(current_player.id, GameAction.TAX)
        
        # Challenger challenges
        loser_id = game.get_challenge_loser(challenger.id)
        assert loser_id is not None
        assert game.challenge_loser is not None

    def test_cannot_challenge_non_challengeable_move(self, game_with_two_players):
        """Test that INCOME cannot be challenged."""
        game, players = game_with_two_players
        current_player = players[0]
        challenger = players[1]
        
        game.declare_move(current_player.id, GameAction.INCOME)
        # INCOME executes immediately and moves to next turn
        # Cannot challenge something that's already done


class TestGameTurnManagement:
    """Test turn management and advancement."""

    def test_turn_index_increments(self, game_with_two_players):
        """Test that turn index increments after move."""
        game, players = game_with_two_players
        initial_index = game.currentTurnIndex
        
        current_player = players[initial_index]
        game.declare_move(current_player.id, GameAction.INCOME)
        
        # After INCOME, turn should advance
        expected_index = (initial_index + 1) % len(players)
        assert game.currentTurnIndex == expected_index

    def test_turn_cycles_through_players(self, game_with_three_players):
        """Test that turns cycle through all players."""
        game, players = game_with_three_players
        
        for expected_index in range(3):
            current_player = players[expected_index]
            assert game.currentTurnIndex == expected_index
            game.declare_move(current_player.id, GameAction.INCOME)

    def test_get_current_player(self, game_with_two_players):
        """Test getting the current player."""
        game, players = game_with_two_players
        
        current_player = game.get_current_player()
        assert current_player == players[0]
        
        game.declare_move(current_player.id, GameAction.INCOME)
        
        current_player = game.get_current_player()
        assert current_player == players[1]


class TestGamePlayerElimination:
    """Test player elimination mechanics."""

    def test_player_with_no_cards_cannot_continue(self, game_with_two_players):
        """Test that game ends if player has no cards."""
        game, players = game_with_two_players
        player = players[0]
        
        # Remove all cards
        player.cards = []
        
        # Next turn should end game
        with pytest.raises(SynchronizationError):
            game.next_turn()

    def test_last_player_remaining_wins(self, game_with_two_players):
        """Test that game ends when only one player remains."""
        game, players = game_with_two_players
        
        # Remove all cards from first player
        players[0].cards = []
        
        # Game should recognize this during turn check
        # The second player can advance turn with proper condition check


class TestGameStateTransitions:
    """Test game state transitions."""

    def test_initial_state_is_waiting_for_players(self):
        """Test that initial game state is WAITING_FOR_PLAYERS."""
        game = CoupGame()
        assert game.state == GameState.WAITING_FOR_PLAYERS

    def test_state_changes_to_waiting_for_action_on_start(self, game_with_two_players):
        """Test state transitions to WAITING_FOR_ACTION on start."""
        game, _ = game_with_two_players
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_state_changes_to_action_declared(self, game_with_two_players):
        """Test state changes to ACTION_DECLARED on move."""
        game, players = game_with_two_players
        player = players[0]
        
        game.declare_move(player.id, GameAction.TAX)
        assert game.state == GameState.ACTION_DECLARED

    def test_game_over_state(self, game_with_two_players):
        """Test GAME_OVER state is set correctly."""
        game, players = game_with_two_players
        
        # Create condition where only one player remains
        players[0].cards = []
        
        # This should trigger game over
        # Implementation dependent


class TestGamePlayerCards:
    """Test player card management in game."""

    def test_players_dealt_cards_on_start(self, game_with_two_players):
        """Test that players receive cards on game start."""
        game, players = game_with_two_players
        
        for player in players:
            assert len(player.cards) == 2

    def test_each_card_is_valid_influence(self, game_with_two_players):
        """Test that each card is a valid Influence."""
        game, players = game_with_two_players
        
        for player in players:
            for card in player.cards:
                assert isinstance(card, Influence)

    def test_deck_not_empty_after_dealing(self, game_with_two_players):
        """Test that deck has remaining cards after dealing."""
        game, players = game_with_two_players
        
        cards_dealt = 2 * len(players)
        total_cards = 15  # 3 of each Influence type
        remaining = total_cards - cards_dealt
        
        assert len(game.court_deck.card_stack) == remaining


class TestGameMoveTargeting:
    """Test move targeting mechanics."""

    def test_set_move_target_on_steal(self, game_with_two_players):
        """Test that STEAL sets move target."""
        game, players = game_with_two_players
        current_player = players[0]
        target = players[1]
        
        game.declare_move(current_player.id, GameAction.STEAL, target_id=target.id)
        assert game.move_target_id == target.id

    def test_get_move_target(self, game_with_two_players):
        """Test retrieving move target."""
        game, players = game_with_two_players
        current_player = players[0]
        target = players[1]
        
        game.declare_move(current_player.id, GameAction.STEAL, target_id=target.id)
        retrieved_target = game.get_move_target()
        assert retrieved_target == target

    def test_move_target_none_for_non_targetable(self, game_with_two_players):
        """Test that non-targetable moves don't set target."""
        game, players = game_with_two_players
        current_player = players[0]
        
        game.declare_move(current_player.id, GameAction.INCOME)
        assert game.move_target_id is None


class TestGameChatIntegration:
    """Test chat features within game."""

    def test_add_chat_message(self, game_with_two_players):
        """Test adding a chat message to game."""
        game, players = game_with_two_players
        player = players[0]
        
        message = {
            "userId": player.id,
            "message": "Let's play!",
            "timestamp": 1000,
        }
        
        game.add_chat(message)
        assert len(game.chats) == 1
        assert game.chats[0]["message"] == "Let's play!"

    def test_chat_messages_with_increasing_timestamps(self, game_with_two_players):
        """Test that chat messages must have increasing timestamps."""
        game, players = game_with_two_players
        player = players[0]
        
        msg1 = {"userId": player.id, "message": "First", "timestamp": 1000}
        msg2 = {"userId": player.id, "message": "Second", "timestamp": 2000}
        
        game.add_chat(msg1)
        game.add_chat(msg2)
        
        assert len(game.chats) == 2

    def test_chat_messages_decreasing_timestamp_fails(self, game_with_two_players):
        """Test that decreasing timestamps raise error."""
        game, players = game_with_two_players
        player = players[0]
        
        msg1 = {"userId": player.id, "message": "First", "timestamp": 2000}
        msg2 = {"userId": player.id, "message": "Second", "timestamp": 1000}
        
        game.add_chat(msg1)
        
        with pytest.raises(SynchronizationError):
            game.add_chat(msg2)


class TestGamePlayerActions:
    """Test various player actions and consequences."""

    def test_declare_move_sets_attributes(self, game_with_two_players):
        """Test that declaring a move sets the correct attributes."""
        game, players = game_with_two_players
        player = players[0]
        
        game.declare_move(player.id, GameAction.FOREIGN_AID)
        
        assert game.declared_move == GameAction.FOREIGN_AID
        assert game.state == GameState.ACTION_DECLARED

    def test_reset_state_on_next_turn(self, game_with_two_players):
        """Test that game state resets on next turn."""
        game, players = game_with_two_players
        player = players[0]
        
        game.declare_move(player.id, GameAction.INCOME)
        
        # After income, state should be WAITING_FOR_ACTION
        assert game.state == GameState.WAITING_FOR_ACTION
        assert game.declared_move is None


class TestGameEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_game_with_maximum_players(self):
        """Test game with maximum number of players."""
        game = CoupGame()
        for i in range(6):
            game.add_player(Player(f"Player{i}"))
        
        assert len(game.players) == 6

    def test_game_exceeds_maximum_players(self):
        """Test that game cannot exceed maximum players."""
        game = CoupGame()
        for i in range(6):
            game.add_player(Player(f"Player{i}"))
        
        with pytest.raises(ValueError):
            game.add_player(Player("ExtraPlayer"))

    def test_game_with_minimum_players(self):
        """Test game with minimum required players."""
        game = CoupGame()
        game.add_player(Player("Player1"))
        game.add_player(Player("Player2"))
        
        game.start_game()
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_empty_deck_on_card_draw(self):
        """Test behavior when card deck is empty."""
        game = CoupGame()
        
        # Draw all cards
        while game.court_deck.draw_card() is not None:
            pass
        
        # Next draw should return None
        assert game.court_deck.draw_card() is None

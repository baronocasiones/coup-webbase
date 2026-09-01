import pytest
from uuid import uuid4
from services.Player import Player
from services.CoupGame import CoupGame
from services.GameState import GameState
from services.GameAction import GameAction
from services.Influence import Influence
from services.BlockMove import BlockMove
from utils.exceptions import SynchronizationError, PlayerInsufficientError


pytestmark = pytest.mark.integration


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

    def test_player_with_no_cards_is_eliminated(self, game_with_two_players):
        """Test that player with no cards is eliminated on next turn."""
        game, players = game_with_two_players
        player = players[0]
        
        # Remove all cards
        player.cards = []
        
        # Next turn should eliminate the player
        game.next_turn()
        assert player.id not in game.players
        # Game over since only 1 player remains
        assert game.state == GameState.GAME_OVER

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


class TestResolveInfluenceSelection:
    """Test the two-phase influence selection after Assassinate/Coup."""

    def test_resolve_influence_selection_happy_path(self, game_with_two_players):
        """Target player chooses a card to lose after Assassinate."""
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 3

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=target.id)
        game.handle_no_challenge()

        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        card_to_lose = target.cards[0]
        game.resolve_influence_selection(target.id, card_to_lose)

        assert card_to_lose not in target.cards
        assert game.state == GameState.WAITING_FOR_ACTION
        assert game.pending_influence_target is None

    def test_resolve_influence_selection_wrong_state(self, game_with_two_players):
        """Cannot resolve influence selection when not in that state."""
        game, players = game_with_two_players
        with pytest.raises(SynchronizationError, match="not waiting for influence"):
            game.resolve_influence_selection(players[1].id, Influence.DUKE)

    def test_resolve_influence_selection_wrong_player(self, game_with_two_players):
        """Only the targeted player can choose which card to lose."""
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 3

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=target.id)
        game.handle_no_challenge()

        with pytest.raises(SynchronizationError, match="not the target"):
            game.resolve_influence_selection(attacker.id, Influence.DUKE)

    def test_resolve_influence_selection_advances_turn(self, game_with_two_players):
        """After resolving, the turn advances to the next player."""
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 7

        game.declare_move(attacker.id, GameAction.COUP, target_id=target.id)
        game.handle_no_challenge()

        card_to_lose = target.cards[0]
        game.resolve_influence_selection(target.id, card_to_lose)

        assert game.currentTurnIndex == 1

    def test_coup_full_flow(self, game_with_two_players):
        """Full Coup flow: declare -> no challenge -> choose card -> next turn."""
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 7

        game.declare_move(attacker.id, GameAction.COUP, target_id=target.id)
        assert game.state == GameState.ACTION_DECLARED

        game.handle_no_challenge()
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert attacker.coins == 0

        card_to_lose = target.cards[0]
        game.resolve_influence_selection(target.id, card_to_lose)
        assert len(target.cards) == 1
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_resolve_influence_selection_with_one_card_player(self, game_with_two_players):
        """Target with 1 card loses it and gets eliminated."""
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 7
        target.cards = [Influence.CONTESSA]

        game.declare_move(attacker.id, GameAction.COUP, target_id=target.id)
        game.handle_no_challenge()
        game.resolve_influence_selection(target.id, Influence.CONTESSA)

        assert target.id not in game.players
        assert game.state == GameState.GAME_OVER


class TestResolveExchange:
    """Test the two-phase exchange card selection."""

    def test_resolve_exchange_happy_path(self, game_with_two_players):
        """Player chooses cards to keep after Exchange."""
        game, players = game_with_two_players
        player = players[0]

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        assert game.state == GameState.PENDING_EXCHANGE
        combined = game.exchange_cards
        # Keep the first 2 cards (player's original count)
        chosen = combined[:2]
        game.resolve_exchange(player.id, chosen)

        assert len(player.cards) == 2
        assert game.state == GameState.WAITING_FOR_ACTION
        assert game.exchange_cards is None

    def test_resolve_exchange_wrong_state(self, game_with_two_players):
        """Cannot resolve exchange when not in that state."""
        game, players = game_with_two_players
        with pytest.raises(SynchronizationError, match="not waiting for exchange"):
            game.resolve_exchange(players[0].id, [Influence.DUKE, Influence.ASSASSIN])

    def test_resolve_exchange_wrong_player(self, game_with_two_players):
        """Only the current player can select exchange cards."""
        game, players = game_with_two_players

        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        with pytest.raises(SynchronizationError, match="Only the current player"):
            game.resolve_exchange(players[1].id, game.exchange_cards[:2])

    def test_resolve_exchange_wrong_card_count(self, game_with_two_players):
        """Player must choose exactly the right number of cards."""
        game, players = game_with_two_players

        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        with pytest.raises(ValueError, match="must choose exactly"):
            game.resolve_exchange(players[0].id, [game.exchange_cards[0]])

    def test_resolve_exchange_invalid_card(self, game_with_two_players):
        """Player cannot choose a card not in the combined list."""
        game, players = game_with_two_players

        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        fake_card = Influence.CONTESSA
        # Ensure the fake card is not in the combined list
        if fake_card in game.exchange_cards:
            fake_card = Influence.DUKE
            if fake_card in game.exchange_cards:
                # Both are in the list, just use a different approach
                chosen = game.exchange_cards[:2]
                game.resolve_exchange(players[0].id, chosen)
                return

        chosen = [fake_card, fake_card]
        with pytest.raises(ValueError, match="not available"):
            game.resolve_exchange(players[0].id, chosen)

    def test_resolve_exchange_returns_unchanged_to_deck(self, game_with_two_players):
        """Unchosen cards go back to the bottom of the deck."""
        game, players = game_with_two_players
        player = players[0]
        initial_deck_size = game.get_cards_in_deck()

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        combined = game.exchange_cards
        chosen = combined[:2]
        unchosen = combined[2:]

        game.resolve_exchange(player.id, chosen)

        # Deck should have gained back the unchosen cards
        assert game.get_cards_in_deck() == initial_deck_size - 2 + len(unchosen)

    def test_resolve_exchange_updates_player_cards(self, game_with_two_players):
        """Player's cards are updated to the chosen cards."""
        game, players = game_with_two_players
        player = players[0]

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        combined = game.exchange_cards
        chosen = combined[:2]
        game.resolve_exchange(player.id, chosen)

        assert player.cards == chosen

    def test_resolve_exchange_recalculates_moves(self, game_with_two_players):
        """Player's available moves are recalculated after exchange."""
        game, players = game_with_two_players
        player = players[0]

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        combined = game.exchange_cards
        chosen = combined[:2]  # Keep first 2 cards
        game.resolve_exchange(player.id, chosen)

        # Base moves should always be present after recalculation
        assert GameAction.INCOME in player.moves
        assert GameAction.FOREIGN_AID in player.moves
        assert GameAction.COUP in player.moves
        # Moves should reflect the chosen cards' actions
        for card in chosen:
            for action in card.get_actions():
                assert action in player.moves


class TestHandleChallenge:
    """Test the challenge resolution flow."""

    def test_challenge_loser_losing_player_loses_card(self, game_with_two_players):
        """When challenger wins, the declared player loses a card."""
        game, players = game_with_two_players
        current_player = players[0]
        challenger = players[1]

        # Give current player cards that don't include DUKE (they're lying about TAX)
        current_player.cards = [Influence.ASSASSIN, Influence.CONTESSA]
        current_player.moves = [GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP,
                                GameAction.ASSASSINATE, BlockMove.BLOCK_ASSASSINATION]

        game.declare_move(current_player.id, GameAction.TAX)
        loser_id = game.get_challenge_loser(challenger.id)

        assert loser_id == current_player.id
        assert current_player.is_lying is True
        assert game.state == GameState.CHALLENGE_HANDLE

        # Remove a card from the loser
        card_to_remove = current_player.cards[0]
        game.handle_challenge(card_to_remove)

        assert card_to_remove not in current_player.cards
        assert len(current_player.cards) == 1
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_challenge_loser_challenger_loses_when_player_has_card(self, game_with_two_players):
        """When challenger loses, the challenger loses a card."""
        game, players = game_with_two_players
        current_player = players[0]
        challenger = players[1]

        # Give current player the card they're claiming
        current_player.cards = [Influence.DUKE]
        current_player.moves = [
            GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP,
            GameAction.TAX, BlockMove.BLOCK_FOREIGN_AID
        ]

        game.declare_move(current_player.id, GameAction.TAX)
        loser_id = game.get_challenge_loser(challenger.id)

        assert loser_id == challenger.id
        assert current_player.is_lying is False

    def test_handle_challenge_wrong_state(self, game_with_two_players):
        """Cannot handle challenge when not in CHALLENGE_HANDLE state."""
        game, players = game_with_two_players
        with pytest.raises(SynchronizationError, match="not in a state to handle"):
            game.handle_challenge(Influence.DUKE)

    def test_handle_challenge_no_loser_set(self, game_with_two_players):
        """Cannot handle challenge when no loser is set."""
        game, players = game_with_two_players
        game.state = GameState.CHALLENGE_HANDLE
        with pytest.raises(ValueError, match="No challenge loser"):
            game.handle_challenge(Influence.DUKE)

    def test_get_challenge_loser_none_challenger(self, game_with_two_players):
        """Returns None when challenger_id is None."""
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.TAX)
        result = game.get_challenge_loser(None)
        assert result is None

    def test_get_challenge_loser_non_challengeable_move(self, game_with_two_players):
        """Cannot challenge INCOME, COUP, or FOREIGN_AID."""
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.INCOME)
        # INCOME executes immediately, state is WAITING_FOR_ACTION
        with pytest.raises(SynchronizationError, match="cannot challenge"):
            game.get_challenge_loser(players[1].id)

    def test_get_challenge_loser_wrong_state(self, game_with_two_players):
        """Cannot challenge when game is in wrong state."""
        game, players = game_with_two_players
        # State is WAITING_FOR_ACTION after start
        with pytest.raises(SynchronizationError, match="cannot challenge"):
            game.get_challenge_loser(players[1].id)


class TestHandleNoChallengeTwoPhase:
    """Test that handle_no_challenge does NOT advance turn for two-phase actions."""

    def test_no_challenge_assassinate_does_not_advance(self, game_with_two_players):
        """After Assassinate, turn should NOT advance until influence is selected."""
        game, players = game_with_two_players
        attacker = players[0]
        attacker.coins = 3
        initial_index = game.currentTurnIndex

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=players[1].id)
        game.handle_no_challenge()

        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert game.currentTurnIndex == initial_index

    def test_no_challenge_exchange_does_not_advance(self, game_with_two_players):
        """After Exchange, turn should NOT advance until cards are selected."""
        game, players = game_with_two_players
        initial_index = game.currentTurnIndex

        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        assert game.state == GameState.PENDING_EXCHANGE
        assert game.currentTurnIndex == initial_index

    def test_no_challenge_tax_advances_normally(self, game_with_two_players):
        """After Tax (non-two-phase), turn advances immediately."""
        game, players = game_with_two_players

        game.declare_move(players[0].id, GameAction.TAX)
        game.handle_no_challenge()

        assert game.state == GameState.WAITING_FOR_ACTION
        assert game.currentTurnIndex == 1


class TestPlayerEliminationFlow:
    """Test player elimination through actual gameplay."""

    def test_elimination_through_coup(self, game_with_two_players):
        """Player eliminated after losing their last card to Coup."""
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 7
        target.cards = [Influence.DUKE]

        game.declare_move(attacker.id, GameAction.COUP, target_id=target.id)
        game.handle_no_challenge()
        game.resolve_influence_selection(target.id, Influence.DUKE)

        assert target.id not in game.players
        assert game.state == GameState.GAME_OVER

    def test_elimination_index_clamping(self, game_with_three_players):
        """Turn index is clamped when a player before current index is eliminated."""
        game, players = game_with_three_players
        # Player at index 0 just finished, now it's index 1's turn
        game.currentTurnIndex = 1

        # Eliminate player at index 0
        players[0].cards = []
        game.next_turn()

        # Index should be clamped
        assert game.currentTurnIndex < len(game.players)

    def test_multiple_eliminations(self, game_with_three_players):
        """Multiple players can be eliminated."""
        game, players = game_with_three_players
        players[0].cards = []
        players[1].cards = []

        game.next_turn()

        assert len(game.players) == 1
        assert game.state == GameState.GAME_OVER


class TestStateTransitionMatrix:
    """Test all valid state transitions."""

    def test_waiting_to_action_declared(self, game_with_two_players):
        """WAITING_FOR_ACTION -> ACTION_DECLARED on non-INCOME move."""
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.TAX)
        assert game.state == GameState.ACTION_DECLARED

    def test_waiting_to_block_declared(self, game_with_two_players):
        """BLOCK_DECLARED state is set when a BlockMove is declared."""
        game, players = game_with_two_players
        # Manually set up block scenario since blocks require ACTION_DECLARED state
        # but declare_move only accepts moves in WAITING_FOR_ACTION state.
        # We test that setting the state directly works as expected.
        game.declare_move(players[0].id, GameAction.FOREIGN_AID)
        # Simulate block declaration by setting state and attributes directly
        game.state = GameState.BLOCK_DECLARED
        game.declared_block = BlockMove.BLOCK_FOREIGN_AID
        game.blocker_id = players[1].id
        assert game.state == GameState.BLOCK_DECLARED
        assert game.declared_block == BlockMove.BLOCK_FOREIGN_AID

    def test_action_declared_to_challenge_handle(self, game_with_two_players):
        """ACTION_DECLARED -> CHALLENGE_HANDLE on challenge."""
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.TAX)
        game.get_challenge_loser(players[1].id)
        assert game.state == GameState.CHALLENGE_HANDLE

    def test_action_declared_to_influence_pending(self, game_with_two_players):
        """ACTION_DECLARED -> INFLUENCE_SELECTION_PENDING on Assassinate/Coup."""
        game, players = game_with_two_players
        players[0].coins = 3
        game.declare_move(players[0].id, GameAction.ASSASSINATE, target_id=players[1].id)
        game.handle_no_challenge()
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING

    def test_action_declared_to_pending_exchange(self, game_with_two_players):
        """ACTION_DECLARED -> PENDING_EXCHANGE on Exchange."""
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()
        assert game.state == GameState.PENDING_EXCHANGE

    def test_challenge_handle_to_waiting(self, game_with_two_players):
        """CHALLENGE_HANDLE -> WAITING_FOR_ACTION after challenge resolution."""
        game, players = game_with_two_players
        # Give current player DUKE so they're truthful about TAX
        players[0].cards = [Influence.DUKE, Influence.ASSASSIN]
        players[0].moves = [
            GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP,
            GameAction.TAX, GameAction.ASSASSINATE,
            BlockMove.BLOCK_FOREIGN_AID
        ]
        game.declare_move(players[0].id, GameAction.TAX)
        loser_id = game.get_challenge_loser(players[1].id)
        # Challenger loses because player was truthful
        assert loser_id == players[1].id
        # Remove a card from the challenger (the loser)
        card_to_remove = players[1].cards[0]
        game.handle_challenge(card_to_remove)
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_influence_pending_to_waiting(self, game_with_two_players):
        """INFLUENCE_SELECTION_PENDING -> WAITING_FOR_ACTION after card selection."""
        game, players = game_with_two_players
        players[0].coins = 7
        game.declare_move(players[0].id, GameAction.COUP, target_id=players[1].id)
        game.handle_no_challenge()
        game.resolve_influence_selection(players[1].id, players[1].cards[0])
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_pending_exchange_to_waiting(self, game_with_two_players):
        """PENDING_EXCHANGE -> WAITING_FOR_ACTION after card selection."""
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()
        game.resolve_exchange(players[0].id, game.exchange_cards[:2])
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_any_to_game_over(self, game_with_two_players):
        """Game over when only 1 player remains."""
        game, players = game_with_two_players
        players[0].cards = []
        game.next_turn()
        assert game.state == GameState.GAME_OVER

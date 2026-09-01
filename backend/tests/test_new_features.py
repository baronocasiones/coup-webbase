import pytest
from uuid import uuid4
from services.CoupGame import CoupGame
from services.Player import Player
from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove
from services.Influence import Influence
from utils.exceptions import SynchronizationError
from utils.globals import COUP_THRESHOLD


pytestmark = pytest.mark.unit


@pytest.fixture
def game():
    return CoupGame()


@pytest.fixture
def player():
    return Player("Alice")


@pytest.fixture
def player2():
    return Player("Bob")


@pytest.fixture
def player3():
    return Player("Charlie")


@pytest.fixture
def game_with_two_players(game, player, player2):
    game.add_player(player)
    game.add_player(player2)
    game.start_game()
    return game, [player, player2]


@pytest.fixture
def game_with_three_players(game, player, player2, player3):
    game.add_player(player)
    game.add_player(player2)
    game.add_player(player3)
    game.start_game()
    return game, [player, player2, player3]


# =============================================================================
# Forced Coup Tests
# =============================================================================


class TestForcedCoup:
    def test_player_with_ten_coins_must_coup(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player.coins = COUP_THRESHOLD

        with pytest.raises(SynchronizationError, match="must coup"):
            game.declare_move(player.id, GameAction.INCOME)

    def test_player_with_ten_coins_can_still_coup(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        target = players[1]
        player.coins = COUP_THRESHOLD

        # Ensure target has at least one card to lose
        card_to_remove = target.cards[0]
        game.declare_move(player.id, GameAction.COUP, target_id=target.id)
        game.handle_no_challenge()
        game.resolve_influence_selection(target.id, card_to_remove)

        assert player.coins == COUP_THRESHOLD - 7

    def test_player_with_nine_coins_can_do_anything(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player.coins = COUP_THRESHOLD - 1

        # Should not raise
        game.declare_move(player.id, GameAction.INCOME)
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_forced_coup_does_not_apply_to_blocks(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]

        # Player 1 declares foreign aid
        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        assert game.state == GameState.ACTION_DECLARED

        # Player 2 blocks — blocks are allowed regardless of coins
        player2.coins = COUP_THRESHOLD
        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)
        assert game.state == GameState.BLOCK_DECLARED

    def test_forced_coup_rejects_tax(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player.coins = 15

        with pytest.raises(SynchronizationError, match="must coup"):
            game.declare_move(player.id, GameAction.TAX)

    def test_forced_coup_rejects_assassinate(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        target = players[1]
        player.coins = 12

        with pytest.raises(SynchronizationError, match="must coup"):
            game.declare_move(player.id, GameAction.ASSASSINATE, target_id=target.id)

    def test_forced_coup_rejects_steal(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        target = players[1]
        player.coins = 10

        with pytest.raises(SynchronizationError, match="must coup"):
            game.declare_move(player.id, GameAction.STEAL, target_id=target.id)

    def test_forced_coup_rejects_exchange(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player.coins = 10

        with pytest.raises(SynchronizationError, match="must coup"):
            game.declare_move(player.id, GameAction.EXCHANGE)

    def test_forced_coup_rejects_foreign_aid(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player.coins = 10

        with pytest.raises(SynchronizationError, match="must coup"):
            game.declare_move(player.id, GameAction.FOREIGN_AID)


# =============================================================================
# Block Resolution Tests
# =============================================================================


class TestBlockDeclaration:
    def test_block_during_action_declared_sets_block_declared(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]

        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        assert game.state == GameState.ACTION_DECLARED

        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)
        assert game.state == GameState.BLOCK_DECLARED
        assert game.declared_block == BlockMove.BLOCK_FOREIGN_AID
        assert game.blocker_id == player2.id

    def test_block_during_waiting_for_action_is_rejected(self, game_with_two_players):
        game, players = game_with_two_players
        player2 = players[1]

        with pytest.raises(SynchronizationError, match="Can only block when an action has been declared"):
            game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)

    def test_current_player_cannot_block_own_move(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]

        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        with pytest.raises(SynchronizationError, match="Current player cannot block their own move"):
            game.declare_move(player1.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player1.id)

    def test_block_steal(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]

        game.declare_move(player1.id, GameAction.STEAL, target_id=player2.id)
        game.declare_move(player2.id, BlockMove.BLOCK_STEAL, blocker_id=player2.id)
        assert game.state == GameState.BLOCK_DECLARED

    def test_block_assassination(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]

        game.declare_move(player1.id, GameAction.ASSASSINATE, target_id=player2.id)
        game.declare_move(player2.id, BlockMove.BLOCK_ASSASSINATION, blocker_id=player2.id)
        assert game.state == GameState.BLOCK_DECLARED


class TestBlockChallenge:
    def test_challenge_block_checker_blocker_has_card(self, game_with_three_players):
        """When blocker has the card, challenger loses influence."""
        game, players = game_with_three_players
        player1 = players[0]
        player2 = players[1]
        player3 = players[2]

        # Give player2 a Duke (can block foreign aid)
        player2.cards = [Influence.DUKE, Influence.ASSASSIN]
        player2.moves = [
            GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP,
            GameAction.TAX, GameAction.ASSASSINATE,
            BlockMove.BLOCK_FOREIGN_AID,
        ]

        # Player1 declares foreign aid, player2 blocks, player3 challenges
        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)

        loser_id = game.get_challenge_loser(player3.id)
        # Blocker was truthful — challenger (player3) loses
        assert loser_id == player3.id
        assert game.state == GameState.CHALLENGE_HANDLE

    def test_challenge_block_checker_blocker_lying(self, game_with_three_players):
        """When blocker is lying, blocker loses influence."""
        game, players = game_with_three_players
        player1 = players[0]
        player2 = players[1]
        player3 = players[2]

        # Player2 has no Duke — can't truthfully block foreign aid
        player2.cards = [Influence.ASSASSIN, Influence.CONTESSA]
        player2.moves = [
            GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP,
            GameAction.ASSASSINATE,
            BlockMove.BLOCK_ASSASSINATION,
        ]

        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)

        loser_id = game.get_challenge_loser(player3.id)
        # Blocker was lying — blocker (player2) loses
        assert loser_id == player2.id
        assert game.state == GameState.CHALLENGE_HANDLE

    def test_challenge_action_still_works(self, game_with_two_players):
        """Challenging an action (not a block) still works as before."""
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]

        # Player1 declares tax but has no Duke
        player1.cards = [Influence.ASSASSIN, Influence.CONTESSA]
        player1.moves = [
            GameAction.INCOME, GameAction.FOREIGN_AID, GameAction.COUP,
            GameAction.ASSASSINATE,
            BlockMove.BLOCK_ASSASSINATION,
        ]

        game.declare_move(player1.id, GameAction.TAX)
        loser_id = game.get_challenge_loser(player2.id)
        # Player1 was lying — player1 loses
        assert loser_id == player1.id


class TestBlockNoChallenge:
    def test_no_challenge_on_block_cancels_action(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]
        initial_coins = player1.coins

        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)
        assert game.state == GameState.BLOCK_DECLARED

        game.handle_no_challenge()
        # Block stood — action was cancelled, player1 did not get coins
        assert player1.coins == initial_coins
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_no_challenge_on_action_executes(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        initial_coins = player1.coins

        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        assert game.state == GameState.ACTION_DECLARED

        game.handle_no_challenge()
        # No block — action executed
        assert player1.coins == initial_coins + 2
        assert game.state == GameState.WAITING_FOR_ACTION


class TestDeclaredBlockReset:
    def test_next_turn_resets_declared_block(self, game_with_two_players):
        game, players = game_with_two_players
        player1 = players[0]
        player2 = players[1]

        game.declare_move(player1.id, GameAction.FOREIGN_AID)
        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, blocker_id=player2.id)
        assert game.declared_block == BlockMove.BLOCK_FOREIGN_AID

        game.handle_no_challenge()
        assert game.declared_block is None
        assert game.blocker_id is None


# =============================================================================
# Chat Tests
# =============================================================================


class TestChatTimestamps:
    def test_null_timestamps_are_accepted(self, game):
        """Messages without timestamps should be accepted."""
        game.add_chat({"message": "hello", "userId": str(uuid4())})
        game.add_chat({"message": "world", "userId": str(uuid4())})
        assert len(game.chats) == 2

    def test_first_message_any_timestamp(self, game):
        """First message should always be accepted."""
        game.add_chat({"message": "hello", "timestamp": None})
        assert len(game.chats) == 1

    def test_valid_timestamp_ordering(self, game):
        """Messages with increasing timestamps should be accepted."""
        game.add_chat({"message": "first", "timestamp": 1000})
        game.add_chat({"message": "second", "timestamp": 2000})
        assert len(game.chats) == 2

    def test_equal_timestamps_accepted(self, game):
        """Messages with equal timestamps should be accepted."""
        game.add_chat({"message": "first", "timestamp": 1000})
        game.add_chat({"message": "second", "timestamp": 1000})
        assert len(game.chats) == 2

    def test_out_of_order_timestamps_rejected(self, game):
        """Messages with older timestamps should be rejected."""
        game.add_chat({"message": "first", "timestamp": 2000})
        with pytest.raises(SynchronizationError, match="older than"):
            game.add_chat({"message": "second", "timestamp": 1000})

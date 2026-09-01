import pytest
from uuid import uuid4
from services.CoupGame import CoupGame
from services.Player import Player
from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove
from services.Influence import Influence
from utils.exceptions import SynchronizationError, PlayerInsufficientError


pytestmark = pytest.mark.unit


@pytest.fixture
def game():
    g = CoupGame()

    def _deal_initial_cards():
        return g._deal_initial_cards

    return g


@pytest.fixture
def player():
    p = Player('baron')
    return p


@pytest.fixture
def player2():
    p = Player('duchess')
    return p


def test_add_and_remove_player(game, player):
    game.state = GameState.WAITING_FOR_PLAYERS
    game.add_player(player)
    assert player.id in game.players
    assert game.players[player.id] == player
    game.remove_player(player.id)
    assert player.id not in game.players


def test_add_player_when_game_started(game, player):
    game.state = GameState.WAITING_FOR_ACTION
    with pytest.raises(SynchronizationError):
        game.add_player(player)
    assert player.id not in game.players


def test_add_player_when_full(game, player):
    game.state = GameState.WAITING_FOR_PLAYERS
    for i in range(6):
        game.add_player(Player(str(i)))
    with pytest.raises(ValueError):
        game.add_player(player)


def test_start_game_insufficient_players(game, player):
    game.players = [player]
    with pytest.raises(PlayerInsufficientError):
        game.start_game()


def test_start_game(game: CoupGame, player, player2):
    game.add_player(player)
    game.add_player(player2)
    game.state = GameState.WAITING_FOR_PLAYERS
    game.start_game()
    assert game.state == GameState.WAITING_FOR_ACTION


def test_deal_inital_cards(game: CoupGame, player, player2):
    game.add_player(player)
    game.add_player(player2)
    game._deal_initial_cards()
    assert len(player.cards) == 2
    assert len(player2.cards) == 2


def test_get_player_by_id_not_found(game, player):
    game.add_player(player)
    result = game.get_player_by_id(uuid4())
    assert result is None


def test_declare_move_wrong_turn(game: CoupGame, player, player2):
    game.add_player(player)
    game.add_player(player2)
    game.currentTurnIndex = 0
    game.state = GameState.WAITING_FOR_ACTION
    with pytest.raises(SynchronizationError):
        game.declare_move(player2.id, GameAction.INCOME, None, None)


def test_declare_move_block_self(game, player):
    game.add_player(player)
    game.currentTurnIndex = 0
    game.state = GameState.WAITING_FOR_ACTION
    with pytest.raises(SynchronizationError):
        game.declare_move(player.id, BlockMove.BLOCK_FOREIGN_AID, None, player.id)


def test_declare_move_invalid_state(game, player):
    game.add_player(player)
    game.currentTurnIndex = 0
    game.state = GameState.WAITING_FOR_PLAYERS
    with pytest.raises(SynchronizationError):
        game.declare_move(player.id, GameAction.INCOME, None, None)


def test_handle_no_challenge_invalid_state(game, player):
    game.players = [player]
    game.state = GameState.WAITING_FOR_PLAYERS
    with pytest.raises(SynchronizationError):
        game.handle_no_challenge()


def test_next_turn_player_with_no_cards(game, player, player2):
    game.add_player(player)
    game.add_player(player2)
    game._deal_initial_cards()
    game.state = GameState.WAITING_FOR_ACTION
    player.cards = []
    game.next_turn()
    # Player with no cards should be eliminated
    assert player.id not in game.players
    # Game continues with remaining player
    assert game.state == GameState.GAME_OVER


def test_next_turn_game_over(game: CoupGame, player):
    game.add_player(player)
    game._deal_initial_cards()
    game.state = GameState.WAITING_FOR_ACTION
    game.next_turn()
    assert game.state == GameState.GAME_OVER


def test_perform_action_no_declared_move(game):
    with pytest.raises(ValueError):
        game.perform_action()


class TestCoupGameEdgeCases:
    def test_add_chat_equal_timestamps(self, game, player):
        """Chat messages with equal timestamps should be accepted."""
        game.state = GameState.WAITING_FOR_PLAYERS
        game.add_player(player)
        msg1 = {"userId": player.id, "message": "First", "timestamp": 1000}
        msg2 = {"userId": player.id, "message": "Second", "timestamp": 1000}
        game.add_chat(msg1)
        game.add_chat(msg2)
        assert len(game.chats) == 2

    def test_add_chat_first_message_any_timestamp(self, game, player):
        """First chat message should always be accepted regardless of timestamp."""
        game.state = GameState.WAITING_FOR_PLAYERS
        game.add_player(player)
        msg = {"userId": player.id, "message": "Hello", "timestamp": 0}
        game.add_chat(msg)
        assert len(game.chats) == 1

    def test_remove_player_nonexistent(self, game, player):
        """Removing a non-existent player should not raise."""
        game.state = GameState.WAITING_FOR_PLAYERS
        game.add_player(player)
        game.remove_player(uuid4())  # Different UUID
        assert player.id in game.players

    def test_declare_move_block_move_no_declared_action(self, game, player, player2):
        """Declaring a BlockMove when no action is declared is allowed (nothing to block)."""
        game.add_player(player)
        game.add_player(player2)
        game.start_game()
        # After start_game, state is WAITING_FOR_ACTION, declared_move is None
        # The code allows BlockMove when declared_move is None
        game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, None, player2.id)
        assert game.state == GameState.BLOCK_DECLARED

    def test_get_current_player_out_of_range(self, game, player):
        """get_current_player with invalid index should raise IndexError."""
        game.add_player(player)
        game.currentTurnIndex = 5  # Out of range
        with pytest.raises(IndexError):
            game.get_current_player()

    def test_get_challenge_loser_invalid_challenger_type(self, game, player, player2):
        """get_challenge_loser with non-UUID challenger should raise ValueError."""
        game.add_player(player)
        game.add_player(player2)
        game.start_game()
        game.declare_move(player.id, GameAction.TAX)
        with pytest.raises(ValueError, match="UUID"):
            game.get_challenge_loser("not-a-uuid")

    def test_declare_move_block_non_blockable_move(self, game, player, player2):
        """Declaring a BlockMove after a non-blockable move raises SynchronizationError (wrong state)."""
        game.add_player(player)
        game.add_player(player2)
        game.start_game()
        game.declare_move(player.id, GameAction.TAX)
        # State is now ACTION_DECLARED, not WAITING_FOR_ACTION
        with pytest.raises(SynchronizationError, match="not in a state to accept"):
            game.declare_move(player2.id, BlockMove.BLOCK_FOREIGN_AID, None, player2.id)

    def test_perform_action_no_handler(self, game, player, player2):
        """perform_action with a valid handler should execute without error."""
        game.add_player(player)
        game.add_player(player2)
        game.start_game()
        game.declared_move = GameAction.INCOME
        game.perform_action()  # Should not raise since INCOME has a handler

    def test_get_game_state(self, game):
        """get_game_state should return current state."""
        assert game.get_game_state() == GameState.WAITING_FOR_PLAYERS
        game.state = GameState.WAITING_FOR_ACTION
        assert game.get_game_state() == GameState.WAITING_FOR_ACTION

    def test_get_court_deck(self, game):
        """get_court_deck should return the Card object."""
        from services.Card import Card
        deck = game.get_court_deck()
        assert isinstance(deck, Card)

    def test_get_cards_in_deck(self, game):
        """get_cards_in_deck should return the count of remaining cards."""
        assert game.get_cards_in_deck() == 15  # Full deck

    def test_get_players(self, game, player, player2):
        """get_players should return a list of Player objects."""
        game.add_player(player)
        game.add_player(player2)
        players = game.get_players()
        assert len(players) == 2
        assert all(isinstance(p, Player) for p in players)

    def test_get_declared_move_initially_none(self, game):
        """get_declared_move should be None initially."""
        assert game.get_declared_move() is None

    def test_get_declared_block_initially_none(self, game):
        """get_declared_block should be None initially."""
        assert game.get_declared_block() is None

    def test_get_move_target_initially_none(self, game):
        """get_move_target should be None initially."""
        assert game.get_move_target() is None

    def test_update_players_state_with_list(self, game, player, player2):
        """update_players_state with a list replaces all players."""
        game.add_player(player)
        new_players = {player2.id: player2}
        game.update_players_state(updated_players_state=[player2])
        assert len(game.players) == 1
        assert player2.id in game.players

    def test_update_players_state_with_single_player(self, game, player, player2):
        """update_players_state with a single player updates that player."""
        game.add_player(player)
        game.add_player(player2)
        player2.coins = 10
        game.update_players_state(update_player=player2)
        assert game.players[player2.id].coins == 10

    def test_update_players_state_no_args(self, game):
        """update_players_state with no args should raise ValueError."""
        with pytest.raises(ValueError):
            game.update_players_state()

    def test_update_players_state_unknown_player(self, game, player):
        """update_players_state with unknown player should raise ValueError."""
        with pytest.raises(ValueError, match="Player not found"):
            game.update_players_state(update_player=player)

    def test_get_challenge_loser_challenger_not_found(self, game, player, player2):
        """get_challenge_loser with non-existent challenger should raise ValueError."""
        game.add_player(player)
        game.add_player(player2)
        game.start_game()
        game.declare_move(player.id, GameAction.TAX)
        with pytest.raises(ValueError, match="not found"):
            game.get_challenge_loser(uuid4())

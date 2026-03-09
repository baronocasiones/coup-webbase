import pytest
from uuid import uuid4
from services.CoupGame import CoupGame
from services.Player import Player
from services.GameState import GameState
from services.GameAction import GameAction
from services.BlockMove import BlockMove
from utils.exceptions import SynchronizationError, PlayerInsufficientError


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
    assert player in game.players
    game.remove_player(player.id)
    assert player not in game.players


def test_add_player_when_game_started(game, player):
    game.state = GameState.WAITING_FOR_ACTION
    with pytest.raises(SynchronizationError):
        game.add_player(player)
    assert player not in game.players


def test_add_player_when_full(game, player):
    game.state = GameState.WAITING_FOR_PLAYERS
    game.players = [Player(str(i)) for i in range(6)]
    with pytest.raises(ValueError):
        game.add_player(player)


def test_start_game_insufficient_players(game, player):
    game.players = [player]
    with pytest.raises(PlayerInsufficientError):
        game.start_game()


def test_start_game(game: CoupGame, player, player2):
    game.players = [player, player2]
    game.state = GameState.WAITING_FOR_PLAYERS
    game.start_game()
    assert game.state == GameState.WAITING_FOR_ACTION


def test_deal_inital_cards(game: CoupGame, player, player2):
    game.players = [player, player2]
    game._deal_initial_cards()
    assert len(player.cards) == 2
    assert len(player2.cards) == 2


def test_get_player_by_id_not_found(game, player):
    game.players = [player]
    with pytest.raises(ValueError):
        game.get_player_by_id(uuid4())


def test_declare_move_wrong_turn(game: CoupGame, player, player2):
    game.players = [player, player2]
    game.currentTurnIndex = 0
    game.state = GameState.WAITING_FOR_ACTION
    with pytest.raises(SynchronizationError):
        game.declare_move(player2.id, GameAction.INCOME, None, None)


def test_declare_move_block_self(game, player):
    game.players = [player]
    game.current_player_index = 0
    game.state = GameState.WAITING_FOR_ACTION
    with pytest.raises(SynchronizationError):
        game.declare_move(player.id, BlockMove.BLOCK_FOREIGN_AID, None, player.id)


def test_declare_move_invalid_state(game, player):
    game.players = [player]
    game.current_player_index = 0
    game.state = GameState.WAITING_FOR_PLAYERS
    with pytest.raises(SynchronizationError):
        game.declare_move(player.id, GameAction.INCOME, None, None)


def test_handle_no_challenge_invalid_state(game, player):
    game.players = [player]
    game.state = GameState.WAITING_FOR_PLAYERS
    with pytest.raises(SynchronizationError):
        game.handle_no_challenge()


def test_next_turn_player_with_no_cards(game, player, player2):
    player.cards = []
    game.players = [player, player2]
    with pytest.raises(SynchronizationError):
        game.next_turn()


def test_next_turn_game_over(game: CoupGame, player):
    game.players = [player]
    game._deal_initial_cards()
    game.state = GameState.WAITING_FOR_ACTION
    game.next_turn()
    assert game.state == GameState.GAME_OVER


def test_perform_action_no_declared_move(game):
    with pytest.raises(ValueError):
        game.perform_action()

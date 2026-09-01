import pytest
from services.CoupGame import CoupGame
from services.Player import Player
from services.GameState import GameState
from services.GameAction import GameAction
from services.Influence import Influence
from utils.globals import COUP_COST, ASSASSINATION_COST, AMOUNT_TO_STEAL


pytestmark = pytest.mark.unit


@pytest.fixture
def game_with_two_players():
    game = CoupGame()
    players = [Player("Alice"), Player("Bob")]
    for p in players:
        game.add_player(p)
    game.start_game()
    return game, players


class TestIncome:
    def test_income_adds_one_coin(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        initial = player.coins
        game.declare_move(player.id, GameAction.INCOME)
        assert player.coins == initial + 1

    def test_income_advances_turn(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.INCOME)
        assert game.currentTurnIndex == 1

    def test_income_resets_state_to_waiting(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.INCOME)
        assert game.state == GameState.WAITING_FOR_ACTION

    def test_income_does_not_set_target(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.INCOME)
        assert game.move_target_id is None


class TestForeignAid:
    def test_foreign_aid_adds_two_coins(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        initial = player.coins
        game.declare_move(player.id, GameAction.FOREIGN_AID)
        game.handle_no_challenge()
        assert player.coins == initial + 2

    def test_foreign_aid_sets_action_declared(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.FOREIGN_AID)
        assert game.state == GameState.ACTION_DECLARED
        assert game.declared_move == GameAction.FOREIGN_AID

    def test_foreign_aid_advances_turn_after_no_challenge(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.FOREIGN_AID)
        game.handle_no_challenge()
        assert game.currentTurnIndex == 1


class TestTax:
    def test_tax_adds_three_coins(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        initial = player.coins
        game.declare_move(player.id, GameAction.TAX)
        game.handle_no_challenge()
        assert player.coins == initial + 3

    def test_tax_sets_action_declared(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.TAX)
        assert game.state == GameState.ACTION_DECLARED
        assert game.declared_move == GameAction.TAX


class TestSteal:
    def test_steal_from_player_with_two_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        target.coins = 5
        initial_attacker = attacker.coins
        initial_target = target.coins

        game.declare_move(attacker.id, GameAction.STEAL, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == initial_attacker + AMOUNT_TO_STEAL
        assert target.coins == initial_target - AMOUNT_TO_STEAL

    def test_steal_from_player_with_one_coin(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        target.coins = 1

        game.declare_move(attacker.id, GameAction.STEAL, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == 3  # 2 initial + 1 stolen
        assert target.coins == 0

    def test_steal_from_player_with_zero_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        target.coins = 0

        game.declare_move(attacker.id, GameAction.STEAL, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == 2  # unchanged
        assert target.coins == 0

    def test_steal_without_target_raises_error(self, game_with_two_players):
        game, players = game_with_two_players
        with pytest.raises(ValueError, match="Target player"):
            game.declare_move(players[0].id, GameAction.STEAL, target_id=None)

    def test_steal_sets_target(self, game_with_two_players):
        game, players = game_with_two_players
        game.declare_move(players[0].id, GameAction.STEAL, target_id=players[1].id)
        assert game.move_target_id == players[1].id


class TestAssassinate:
    def test_assassinate_with_exact_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = ASSASSINATION_COST
        initial_coins = attacker.coins

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == initial_coins - ASSASSINATION_COST
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert game.pending_influence_target == target.id

    def test_assassinate_with_more_than_enough_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 10

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == 10 - ASSASSINATION_COST
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING

    def test_assassinate_with_insufficient_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = ASSASSINATION_COST - 1

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=target.id)
        with pytest.raises(ValueError, match="Not enough coins"):
            game.handle_no_challenge()

    def test_assassinate_without_target_raises_error(self, game_with_two_players):
        game, players = game_with_two_players
        players[0].coins = ASSASSINATION_COST
        with pytest.raises(ValueError, match="Target player"):
            game.declare_move(players[0].id, GameAction.ASSASSINATE, target_id=None)

    def test_assassinate_does_not_advance_turn(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        attacker.coins = ASSASSINATION_COST
        initial_index = game.currentTurnIndex

        game.declare_move(attacker.id, GameAction.ASSASSINATE, target_id=players[1].id)
        game.handle_no_challenge()

        assert game.currentTurnIndex == initial_index


class TestCoup:
    def test_coup_with_exact_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = COUP_COST

        game.declare_move(attacker.id, GameAction.COUP, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == 0
        assert game.state == GameState.INFLUENCE_SELECTION_PENDING
        assert game.pending_influence_target == target.id

    def test_coup_with_more_than_enough_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        target = players[1]
        attacker.coins = 15

        game.declare_move(attacker.id, GameAction.COUP, target_id=target.id)
        game.handle_no_challenge()

        assert attacker.coins == 15 - COUP_COST

    def test_coup_with_insufficient_coins(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        attacker.coins = COUP_COST - 1

        game.declare_move(attacker.id, GameAction.COUP, target_id=players[1].id)
        with pytest.raises(ValueError, match="Not enough coins"):
            game.handle_no_challenge()

    def test_coup_without_target_raises_error(self, game_with_two_players):
        game, players = game_with_two_players
        players[0].coins = COUP_COST
        with pytest.raises(ValueError, match="Target player"):
            game.declare_move(players[0].id, GameAction.COUP, target_id=None)

    def test_coup_does_not_advance_turn(self, game_with_two_players):
        game, players = game_with_two_players
        attacker = players[0]
        attacker.coins = COUP_COST
        initial_index = game.currentTurnIndex

        game.declare_move(attacker.id, GameAction.COUP, target_id=players[1].id)
        game.handle_no_challenge()

        assert game.currentTurnIndex == initial_index


class TestExchange:
    def test_exchange_draws_two_cards(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        initial_card_count = len(player.cards)
        initial_deck_size = game.get_cards_in_deck()

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        assert game.state == GameState.PENDING_EXCHANGE
        assert len(game.exchange_cards) == initial_card_count + 2
        assert game.get_cards_in_deck() == initial_deck_size - 2

    def test_exchange_stores_combined_cards(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player_cards = player.get_cards().copy()

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        for card in player_cards:
            assert card in game.exchange_cards

    def test_exchange_does_not_advance_turn(self, game_with_two_players):
        game, players = game_with_two_players
        initial_index = game.currentTurnIndex

        game.declare_move(players[0].id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        assert game.currentTurnIndex == initial_index

    def test_exchange_with_single_card_player(self, game_with_two_players):
        game, players = game_with_two_players
        player = players[0]
        player.cards = [Influence.DUKE]

        game.declare_move(player.id, GameAction.EXCHANGE)
        game.handle_no_challenge()

        assert len(game.exchange_cards) == 3  # 1 original + 2 drawn

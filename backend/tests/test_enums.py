import pytest
from services.GameAction import GameAction
from services.Influence import Influence
from services.BlockMove import BlockMove
from services.GameState import GameState


pytestmark = pytest.mark.unit


class TestGameAction:
    def test_all_actions_exist(self):
        expected = {"INCOME", "FOREIGN AID", "COUP", "TAX", "ASSASSINATE", "STEAL", "EXCHANGE"}
        actual = {action.value for action in GameAction}
        assert actual == expected

    def test_action_count(self):
        assert len(GameAction) == 7

    def test_income_is_targetable(self):
        assert GameAction.INCOME.is_targetable() is False

    def test_foreign_aid_is_not_targetable(self):
        assert GameAction.FOREIGN_AID.is_targetable() is False

    def test_coup_is_targetable(self):
        assert GameAction.COUP.is_targetable() is True

    def test_tax_is_not_targetable(self):
        assert GameAction.TAX.is_targetable() is False

    def test_assassinate_is_targetable(self):
        assert GameAction.ASSASSINATE.is_targetable() is True

    def test_steal_is_targetable(self):
        assert GameAction.STEAL.is_targetable() is True

    def test_exchange_is_not_targetable(self):
        assert GameAction.EXCHANGE.is_targetable() is False

    def test_income_is_not_blockable(self):
        assert GameAction.INCOME.is_blockable() is False

    def test_foreign_aid_is_blockable(self):
        assert GameAction.FOREIGN_AID.is_blockable() is True

    def test_coup_is_not_blockable(self):
        assert GameAction.COUP.is_blockable() is False

    def test_tax_is_not_blockable(self):
        assert GameAction.TAX.is_blockable() is False

    def test_assassinate_is_blockable(self):
        assert GameAction.ASSASSINATE.is_blockable() is True

    def test_steal_is_blockable(self):
        assert GameAction.STEAL.is_blockable() is True

    def test_exchange_is_not_blockable(self):
        assert GameAction.EXCHANGE.is_blockable() is False

    def test_income_is_not_challengeable(self):
        assert GameAction.INCOME.is_challengeable() is False

    def test_foreign_aid_is_not_challengeable(self):
        assert GameAction.FOREIGN_AID.is_challengeable() is False

    def test_coup_is_not_challengeable(self):
        assert GameAction.COUP.is_challengeable() is False

    def test_tax_is_challengeable(self):
        assert GameAction.TAX.is_challengeable() is True

    def test_assassinate_is_challengeable(self):
        assert GameAction.ASSASSINATE.is_challengeable() is True

    def test_steal_is_challengeable(self):
        assert GameAction.STEAL.is_challengeable() is True

    def test_exchange_is_challengeable(self):
        assert GameAction.EXCHANGE.is_challengeable() is True


class TestInfluence:
    def test_all_influences_exist(self):
        expected = {"DUKE", "ASSASSIN", "CAPTAIN", "AMBASSADOR", "CONTESSA"}
        actual = {inf.name for inf in Influence}
        assert actual == expected

    def test_influence_count(self):
        assert len(Influence) == 5

    def test_duke_get_actions(self):
        actions = Influence.DUKE.get_actions()
        assert GameAction.TAX in actions
        assert BlockMove.BLOCK_FOREIGN_AID in actions

    def test_assassin_get_actions(self):
        actions = Influence.ASSASSIN.get_actions()
        assert GameAction.ASSASSINATE in actions
        assert len(actions) == 1

    def test_captain_get_actions(self):
        actions = Influence.CAPTAIN.get_actions()
        assert GameAction.STEAL in actions
        assert BlockMove.BLOCK_STEAL in actions

    def test_ambassador_get_actions(self):
        actions = Influence.AMBASSADOR.get_actions()
        assert GameAction.EXCHANGE in actions
        assert BlockMove.BLOCK_STEAL in actions

    def test_contessa_get_actions(self):
        actions = Influence.CONTESSA.get_actions()
        assert BlockMove.BLOCK_ASSASSINATION in actions
        assert len(actions) == 1


class TestBlockMove:
    def test_all_block_moves_exist(self):
        expected = {"BLOCK FOREIGN AID", "BLOCK ASSASSINATION", "BLOCK STEAL"}
        actual = {bm.value for bm in BlockMove}
        assert actual == expected

    def test_block_move_count(self):
        assert len(BlockMove) == 3


class TestGameState:
    def test_all_states_exist(self):
        expected = {
            "WAITING_FOR_ACTION", "WAITING_FOR_PLAYERS", "ACTION_DECLARED",
            "BLOCK_DECLARED", "CHALLENGE_HANDLE", "GAME_OVER",
            "PENDING_EXCHANGE", "INFLUENCE_SELECTION_PENDING"
        }
        actual = {state.value for state in GameState}
        assert actual == expected

    def test_state_count(self):
        assert len(GameState) == 8

    def test_states_are_strings(self):
        for state in GameState:
            assert isinstance(state.value, str)

    def test_state_names_match_values(self):
        for state in GameState:
            assert state.name == state.value

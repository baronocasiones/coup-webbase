import logging
from abc import ABC, abstractmethod
from utils.globals import COUP_COST, ASSASSINATION_COST
from services.Influence import Influence
from services.GameAction import GameAction
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame

logger = logging.getLogger(__name__)


class BaseActionStrategy(ABC):
    @abstractmethod
    def execute(self, game: 'CoupGame', **kwargs):
        pass


class BaseRemoveInfluence(ABC):
    move_cost_handler = {
        GameAction.COUP: COUP_COST,
        GameAction.ASSASSINATE: ASSASSINATION_COST
    }

    def phase_two(self, game: 'CoupGame', influence_to_remove: Influence, **kwargs):
        player = game.get_current_player()
        target_player = game.get_move_target()
        current_move = game.get_declared_move()
        move_cost = self.move_cost_handler.get(current_move)

        if target_player is None:
            raise ValueError("Target player must be specified for a coup.")
        if player.coins < move_cost:
            raise ValueError("Not enough coins to perform a coup.")

        try:
            player.coins -= move_cost
            target_player.remove_card(influence_to_remove)
        except ValueError as e:
            logger.error("Failed to remove influence: %s", e)
        except Exception as e:
            logger.error("Unexpected error in phase_two: %s", e, exc_info=True)

from utils.globals import COUP_COST
from .base import BaseActionStrategy
from .base import BaseRemoveInfluence

from services.Influence import Influence

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class Coup(BaseActionStrategy, BaseRemoveInfluence):
    def execute(self, game: 'CoupGame', **kwargs) -> list[Influence]:
        player = game.get_current_player()
        target_player = game.get_move_target()
        if player.get_coins() < COUP_COST:
            raise ValueError("Not enough coins to perform Coup action.")
        if target_player is None:
            raise ValueError("Target player must be specified for Coup action.")
        return target_player.get_cards()






from services.actions.base import BaseActionStrategy
from services.actions.decorators import prompt_user_input
from utils.globals import ASSASSINATION_COST
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class Assassinate(BaseActionStrategy):
    @prompt_user_input
    def execute(self, game: 'CoupGame', **kwargs):
        player = game.get_current_player()
        target_player = game.get_move_target()
        if player.get_coins() < ASSASSINATION_COST:
            raise ValueError("Not enough coins to perform Assassinate action.")
        if target_player is None:
            raise ValueError("Target player must be specified for Assassinate action.")
        return target_player.get_cards()

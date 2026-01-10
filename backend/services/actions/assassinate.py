from services.actions.base import BaseActionStrategy
from services.CoupGame import CoupGame
from services.Influence import Influence
from utils.globasl import ASSASSINATION_COST


class Assassinate(BaseActionStrategy):
    def execute(self, game: CoupGame, **kwargs):
        player = game.get_current_player()
        target_player = game.get_move_target()
        if player.get_coins() < ASSASSINATION_COST:
            raise ValueError("Not enough coins to perform Assassinate action.")
        if target_player is None:
            raise ValueError("Target player must be specified for Assassinate action.")
        return target_player.get_cards()

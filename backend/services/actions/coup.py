from utils.globals import COUP_COST
from .base import BaseActionStrategy
from .base import BaseRemoveInfluence
from .base.decorators import prompt_user_input

from services.CoupGame import CoupGame
from services.Invluence import Influence


class Coup(BaseActionStrategy, BaseRemoveInfluence):
    @prompt_user_input
    def execute(self, game: CoupGame, **kwargs) -> list[Influence]:
        player = game.get_current_player()
        target_player = game.get_move_target()
        if player.get_coins() < COUP_COST:
            raise ValueError("Not enough coins to perform Coup action.")
        if target_player is None:
            raise ValueError("Target player must be specified for Coup action.")
        return target_player.get_cards()






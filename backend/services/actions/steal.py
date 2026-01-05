from services.actions.base import BaseActionStrategy
from services.CoupGame import CoupGame
from utils.globals import AMOUNT_TO_STEAL


class Steal(BaseActionStrategy):
    def execute(self, game: CoupGame, **kwargs):
        player = game.get_current_player()
        target_player = game.get_target_player()

        if not target_player:
            raise ValueError("Target player must be specified for Steal action.")

        stolen_amount = min(AMOUNT_TO_STEAL, target_player.coins)
        target_player.coins -= stolen_amount
        player.coins += stolen_amount

from services.actions.base import BaseActionStrategy
from services.CoupGame import CoupGame


class Tax(BaseActionStrategy):
    def execute(self, game: CoupGame, *args, **kwargs):
        player = game.get_current_player()
        player.coins += 3

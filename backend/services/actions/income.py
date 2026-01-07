from .base import BaseActionStrategy
from services.CoupGame import CoupGame


class Income(BaseActionStrategy):
    def execute(self, game: CoupGame, *args, **kwargs):
        player = game.get_current_player()
        player.coins += 1

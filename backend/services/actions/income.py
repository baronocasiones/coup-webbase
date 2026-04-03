from .base import BaseActionStrategy

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class Income(BaseActionStrategy):
    def execute(self, game: 'CoupGame', **kwargs):
        player = game.get_current_player()
        player.coins += 1

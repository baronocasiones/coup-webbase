from services.actions.base import BaseActionStrategy

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class Tax(BaseActionStrategy):
    def execute(self, game: 'CoupGame', **kwargs):
        player = game.get_current_player()
        player.coins += 3

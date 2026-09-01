from services.actions.base import BaseActionStrategy
from services.GameState import GameState
from utils.globals import COUP_COST
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class Coup(BaseActionStrategy):
    def execute(self, game: 'CoupGame', **kwargs):
        player = game.get_current_player()
        target_player = game.get_move_target()

        if player.get_coins() < COUP_COST:
            raise ValueError("Not enough coins to perform Coup action.")
        if target_player is None:
            raise ValueError("Target player must be specified for Coup action.")

        # Deduct cost
        player.coins -= COUP_COST

        # Enter two-phase state: target player must choose a card to lose
        game.state = GameState.INFLUENCE_SELECTION_PENDING
        game.pending_influence_target = target_player.id

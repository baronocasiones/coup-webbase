from .base import BaseActionStrategy
from services.CoupGame import CoupGame
from services.Player import Player
from utils.globals import COUP_COST


class Coup(BaseActionStrategy):
    def execute(self, game: CoupGame, index_to_remove: int, **kwargs):
        player: Player = game.get_current_player()
        target_player = game.get_target_player()

        if target_player is None:
            raise ValueError("Target player must be specified for a coup.")
        if player.coins < COUP_COST:
            raise ValueError("Not enough coins to perform a coup.")

        try:
            player.coins -= COUP_COST
            target_player.remove_card(index_to_remove)
        except IndexError as e:
            print(e)
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

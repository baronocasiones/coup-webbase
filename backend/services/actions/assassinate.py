from services.actions.base import BaseActionStrategy
from services.CoupGame import CoupGame
from services.Influence import Influence
from utils.globasl import ASSASSINATION_COST


class Assassinate(BaseActionStrategy):
    def execute(self, game: CoupGame, index_to_remove: Influence, *args, **kwargs):
        player = game.get_current_player()
        target_player = game.get_move_target()

        if target_player is None:
            raise ValueError("Target player must be specified for a coup.")
        if player.coins < ASSASSINATION_COST:
            raise ValueError("Not enough coins to perform a coup.")

        try:
            player.coins -= ASSASSINATION_COST
            target_player.remove_card(index_to_remove)
        except IndexError as e:
            print(e)
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

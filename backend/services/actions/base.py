from abc import ABC, abstractmethod
from services.CoupGame import CoupGame
from services.GameAction import GameAction
from services.Influence import Influence
from utils.globasl import COUP_COST, ASSASSINATE_COST


class BaseActionStrategy(ABC):
    @abstractmethod
    def execute(self, game: CoupGame, **kwargs):
        pass


class BaseRemoveInfluence(ABC):
    move_cost_handler = {
        GameAction.COUP: COUP_COST,
        GameAction.ASSASSINATE: ASSASSINATE_COST
    }

    def phase_two(self, game: CoupGame, influence_to_remove: Influence, **kwargs):
        player = game.get_current_player()
        target_player = game.get_move_target()
        current_move = game.get_current_move()
        move_cost = self.move_cost_handler.get(current_move, None)

        if target_player is None:
            raise ValueError("Target player must be specified for a coup.")
        if player.coins < move_cost:
            raise ValueError("Not enough coins to perform a coup.")

        try:
            player.coins -= move_cost
            target_player.remove_card(influence_to_remove)
        except IndexError as e:
            print(e)
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

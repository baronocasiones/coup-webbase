from typing import Callable
from services.GameAction import GameAction

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.actions.exchange import Exchange
    from services.actions.base import BaseRemoveInfluence
    from services.CoupGame import CoupGame

from controllers.GameController import game_controller


def prompt_user_input(func: Callable) -> Callable:
    async def wrapper(self: 'Exchange | BaseRemoveInfluence', game: 'CoupGame', *args, **kwargs):
        current_player = game.get_current_player()
        declared_move = game.delcared_move
        if declared_move is None:
            raise ValueError("No declared move found for the current action.")
        if declared_move == GameAction.EXCHANGE:
            initial_player_card = current_player.get_cards()
            combined_influence = func(self, game, *args, **kwargs)
            # call an async function from controller that will send combined_influence to user
            user_input = await game_controller.send_options_to_user(
                current_player.id,
                {'payload': combined_influence}
            )
            # call self.phase_two after getting user input
            self.phase_two(
                game,
                user_input,
                initial_player_card,
                combined_influence
            )
        elif declared_move in [GameAction.ASSASSINATE, GameAction.COUP]:
            influences = func(self, game, *args, **kwargs)
            # call an async function from controller that will send influences to user
            user_input = await game_controller.send_options_to_user(
                current_player.id,
                {'payload': influences}
            )
            self.phase_two(game, user_input)
    return wrapper

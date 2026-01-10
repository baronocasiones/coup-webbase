from typing import Callable
from services.CoupGame import CoupGame
from services.actions.exchange import Exchange
from services.actions.base import BaseRemoveInfluence

from controllers.GameController import game_controller


def prompt_user_input(func: Callable) -> Callable:
    async def wrapper(self: Exchange | BaseRemoveInfluence, game: CoupGame, *args, **kwargs):
        current_player = game.get_current_player()
        player_choice = kwargs.get("player_choice", None)
        if not isinstance(player_choice, list):
            raise ValueError("player_choice must be provided as a list of Influence objects.")
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
    return wrapper

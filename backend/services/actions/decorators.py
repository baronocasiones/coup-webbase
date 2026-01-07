from typing import Callable
from services.CoupGame import CoupGame
from services.Influence import Influence


def prompt_user_input(func: Callable) -> Callable:
    async def wrapper(self, game: CoupGame, *args, **kwargs):
        current_player = game.get_current_player()
        player_choice = kwargs.get("player_choice", None)
        initial_player_card = current_player.get_cards()
        if not isinstance(player_choice, list):
            raise ValueError("player_choice must be provided as a list of Influence objects.")
        combined_influence = func(self, game, *args, **kwargs)
        # TODO:
        # call an asnc function from controller that will send combined_influence to user
        # call self.phase_two after getting user input
    return wrapper

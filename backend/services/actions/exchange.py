from services.actions.base import BaseActionStrategy
from services.CoupGame import CoupGame
from services.Influence import Influence
from services.Card import Card

from utils.globals import EXCHANGE_DRAW

from .decorators import prompt_user_input


class Exchange(BaseActionStrategy):
    @prompt_user_input
    def execute(self, game: CoupGame, **kwargs):
        current_player = game.get_current_player()
        deck = game.get_court_deck()

        # Draw two cards from the deck
        drawn_cards = [deck.draw_card() for _ in range(EXCHANGE_DRAW)]
        player_cards = current_player.get_cards()

        combined_influences = player_cards + drawn_cards
        return combined_influences

    def phase_two(
        self,
        game: CoupGame,
        player_choice: list[Influence],
        initial_player_card: list[Influence],
        combined_influences: list[Influence]
    ) -> None:
        deck = game.get_court_deck()
        current_player = game.get_current_player()
        # Let the player choose which influences to keep
        if len(player_choice) != len(initial_player_card):
            raise ValueError(
                f"""Player must choose exactly
                {len(initial_player_card)}
                influences to keep."""
            )

        # Validate chosen influences using a copy to handle duplicates
        cards_to_return = combined_influences.copy()
        for influence in player_choice:
            if influence not in cards_to_return:
                raise ValueError(f"Chosen influence {influence} is not available.")
            cards_to_return.remove(influence)

        # Update player's influences
        current_player.update_cards(player_choice)

        # Return unchosen influences to the deck
        for influence in cards_to_return:
            deck.return_card(influence)

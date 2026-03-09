from uuid import UUID
from typing import TYPE_CHECKING
from services.ConnectionManager import ConnectionManager
from models.PlayerModel import PlayerModel

if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class GameController:
    def __init__(self):
        self.game: 'CoupGame' = None
        self.game_manager: ConnectionManager = None

    def set_game(self, game: 'CoupGame'):
        self.game = game

    def set_game_manager(self, game_manager: ConnectionManager):
        self.game_manager = game_manager

    def get_player_by_id(self, user_id):
        return self.game.get_player_by_id(user_id)

    async def send_options_to_user(self, user_id: UUID, payload: dict | list):
        await self.game_manager.send_personal_message(user_id, payload)

    def get_game_states(self) -> dict:
        loser_id = self.game.get_challenge_loser()
        return {
            "state": self.game.get_game_state(),
            "cardsInDeck": self.game.get_cards_in_deck(),
            "playersState": [PlayerModel(**vars(player)) for player in self.game.get_players()],
            "declaredMove": self.game.get_declared_move(),
            "declaredBlock": self.game.get_declared_block(),
            "challengeLoser": self.get_player_by_id(loser_id) if loser_id is not None else None,
            "currentTurn": PlayerModel(**vars(self.game.get_current_player())),
        }

    def declare_move(self, *args, **kwargs) -> None: 
        self.game.declare_move(*args, **kwargs)


game_controller = GameController()

from uuid import UUID
from typing import TYPE_CHECKING
from services.ConnectionManager import ConnectionManager

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


game_controller = GameController()

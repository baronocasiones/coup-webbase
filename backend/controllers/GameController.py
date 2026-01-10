from controllers.LobbyController import lobby_controller
from services.ConnectionManager import ConnectionManager
from uuid import UUID


class GameController:
    def __init__(self):
        self.game = lobby_controller.game
        self.game_manager = ConnectionManager()

    def get_player_by_id(self, user_id):
        return self.game.get_player_by_id(user_id)

    async def send_options_to_user(self, user_id: UUID, payload: dict | list):
        await self.game_manager.send_personal_message(user_id, payload)


game_controller = GameController()

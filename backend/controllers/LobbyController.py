from uuid import UUID
from utils.exceptions import PlayerNotFoundError, SynchronizationError
from services.Player import Player
from services.ConnectionManager import ConnectionManager

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from services.CoupGame import CoupGame


class LobbyController:
    def __init__(self) -> None:
        self.game: 'CoupGame' = None
        self.lobby_manager = None

    def remove_player(self, player_id: UUID) -> None:
        self.game.remove_player(player_id)

    def add_player(self, player: Player) -> None:
        try:
            self.game.add_player(player)
        except SynchronizationError as e:
            raise SynchronizationError("Failed to add player due to synchronization error.") from e

    def update_players_state(self, target_player_id: UUID) -> None:
        for player in self.game.players:
            if player.id == target_player_id:
                player.toggle_ready()
                self.game.update_players_state(update_player=player)

    def get_player_by_id(self, user_id: UUID) -> Player:
        player = self.game.get_player_by_id(user_id)
        if not player:
            raise PlayerNotFoundError("This Player ID is not found.")
        return player

    def get_players(self) -> list[Player]:
        return self.game.players

    def get_game_chats(self) -> list[dict]:
        return self.game.chats

    def get_game_last_chat(self) -> dict | None:
        return self.game.chats[-1] if self.game.chats else None

    def add_game_chat(self, chat: dict) -> None:
        self.game.add_chat(chat)

    def set_game(self, game: 'CoupGame') -> None:
        self.game = game

    def set_lobby_manager(self, lobby_manager: ConnectionManager):
        self.lobby_manager = lobby_controller

    def start_game(self) -> None:
        self.game.start_game()


lobby_controller = LobbyController()

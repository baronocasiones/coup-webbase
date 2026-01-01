from uuid import UUID, uuid4
from services.Player import Player
from services.GameState import GameState
from utils.exceptions import SynchronizationError

class CoupGame:
    def __init__(self):
        self.declared_move: str = ""
        self.players: list[Player] = []
        self.game_id: UUID = uuid4()
        self.move_logs: list[Logs] = []
        self.turn: int = 0
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
        self.chats: list[dict] = []

    def add_chat(self, chat_message: dict) -> None:
        chat_message_timestamp = chat_message.get("timestamp", None)
        if not self.chats:
            self.chats.append(chat_message)
            return

        last_timestamp = self.chats[-1].get('timestamp')
        if last_timestamp is not None and chat_message_timestamp is not None and last_timestamp <= chat_message_timestamp:
            self.chats.append(chat_message)
        else:
            raise SynchronizationError(
                f"Chat message timestamp ({chat_message_timestamp}) is older than the latest message ({last_timestamp})."
            )

    def update_players_state(self, updated_players_state: list[Player] = None, update_player: Player = None) -> None:
        if update_player:
            for idx, player in enumerate(self.players):
                if player.id == update_player.id:
                    self.players[idx] = update_player
                    break
        else:
            self.players = updated_players_state

    def add_player(self, new_player: Player) -> None:
        self.players.append(new_player)

    def get_player(self, player_id: UUID) -> Player | None:
        for player in self.players:
            if player.id == player_id:
                return player
        raise ValueError("Player not found")

    def start_game(self) -> None:
        pass

    def handle_move(self, player_id: UUID, move: str) -> None:
        pass

    def handle_challenge(self) -> None:
        pass

    def resolve_no_challenge(self) -> None:
        pass

    def execute_move(self) -> None:
        pass

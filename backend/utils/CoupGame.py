from uuid import UUID, uuid4
from utils.Player import Player
from utils.GameState import GameState

class CoupGame:
    def __init__(self):
        self.declared_move: str = ""
        self.players: list[Player] = []
        self.game_id: UUID = uuid4()
        self.move_logs: list[Logs] = []
        self.turn: int = 0
        self.state: GameState = GameState.WAITING_FOR_PLAYERS

    def update_players_state(self, updated_players_state: list[Player]) -> None:
        self.players = updated_players_state

    def add_player(self, new_player: Player) -> None:
        self.players.append(new_player)

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

from typing import List
from uuid import UUID, uuid4
from Players import Players

class CoupGame:
    def __init__(self):
        self.declared_move: str = ""
        self.players: List[Players] = []
        self.lobby_id: UUID = uuid4()
        self.move_logs: List[Logs] = []
        self.turn: int = 0
        self.state: GameState = None # for now since GameState is not defined

    def start_game(self) => None:
        pass

    def handle_move(self, player_id: UUID, move: str) => None:
        pass

    def handle_challenge(self) => None:
        pass

    def resolve_no_challenge(self) => None:
        pass

    def execute_move(self) => None:
        pass

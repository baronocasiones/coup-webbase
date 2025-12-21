from uuid import uuid4, UUID

class Players:
    def __init__(self, name):
        self.name: str = name
        self.id: UUID = uuid4()
        self.cards: list[str] = []
        self.coins: int = 2
        self.websocket: WebSocket
        self.is_ready: bool = False

    def change_name(self, new_name: str) -> None:
        self.name = new_name


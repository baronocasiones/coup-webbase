from uuid import uuid4, UUID

class Player:
    def __init__(self, name):
        self.name: str = name
        self.id: UUID = uuid4()
        self.cards: list[str] = []
        self.coins: int = 2
        self.websocket: WebSocket
        self.isReady: bool = False

    def toggle_ready(self) -> None:
        self.isReady = not self.isReady

    def change_name(self, new_name: str) -> None:
        self.name = new_name


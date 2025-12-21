from fastapi import WebSocket
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, WebSocket]

    async def connect(self, webSocket: WebSocket, player_id: UUID):
        await webSocket.accept()
        self.active_connections[player_id] = webSocket
        self.boradcast({"message": f"{player_id} has connected to the lobby"})

    def disconnect(self, player_id: UUID):
        self.active_connections.pop(player_id)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

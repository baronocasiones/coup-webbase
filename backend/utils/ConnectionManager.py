from fastapi import WebSocket
from uuid import UUID
from models.PlayerModel import PlayerModel

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self, websocket: WebSocket, player_id: UUID, player_name: str, players_state: list):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        await self.broadcast(player_id, players_state)

    def disconnect(self, player_id: UUID):
        self.active_connections.pop(player_id)

    async def broadcast(self, sender: UUID, message: dict): 
        for id, connection in self.active_connections.items():
            if id != sender:
                await connection.send_json(message)

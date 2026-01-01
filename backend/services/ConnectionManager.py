from fastapi import WebSocket
from uuid import UUID
from models.PlayerModel import PlayerModel

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self, websocket: WebSocket, player_id: UUID, players_state: list = None, chats: list = None):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        if players_state is not None:
            await self.broadcast(player_id, players_state)
        elif chats is not None:
            await self.broadcast(player_id, chats)
        else:
            raise ValueError("Either players_state or chats must be provided")

    def disconnect(self, player_id: UUID):
        self.active_connections.pop(player_id, None)

    async def broadcast(self, sender: UUID, message: dict): 
        print("MESSAGE:", message)
        for id, connection in self.active_connections.items():
            if id != sender:
                await connection.send_json(message)

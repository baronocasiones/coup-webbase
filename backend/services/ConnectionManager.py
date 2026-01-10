from fastapi import WebSocket
from uuid import UUID
from typing import Optional


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self, websocket: WebSocket, player_id: UUID, players_state: Optional[list] = None, chats: Optional[list] = None):
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

    async def send_personal_message(self, player_id: UUID, message: dict | list):
        connection = self.active_connections.get(player_id)
        if connection:
            await connection.send_json(message)
        else:
            raise ValueError(f"No active connection for player ID: {player_id}")

    async def broadcast(self, sender: UUID, message: dict | list):
        print("MESSAGE:", message)
        for id, connection in self.active_connections.items():
            if id != sender:
                await connection.send_json(message)

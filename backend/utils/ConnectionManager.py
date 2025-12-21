from fastapi import WebSocket
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self, websocket: WebSocket, player_id: UUID, player_name: str):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        await self.broadcast(player_id, {
            "message": f"{player_name} has connected to the lobby",
            "action": "connect",
            "player_id": str(player_id),
            "player_name": player_name
            })

    def disconnect(self, player_id: UUID):
        self.active_connections.pop(player_id)

    async def broadcast(self, sender: UUID, message: dict): 
        for id, connection in self.active_connections.items():
            if id != sender:
                print(f"sending to {id}")
                await connection.send_json(message)

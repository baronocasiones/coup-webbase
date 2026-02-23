from fastapi import WebSocket
from uuid import UUID
from typing import Optional


class ConnectionManager:
    """Manages WebSocket connections for real-time communication between players."""

    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self, websocket: WebSocket, player_id: UUID, players_state: Optional[list] = None, chats: Optional[list] = None):
        """Accept a new WebSocket connection and broadcast the initial state.

        Args:
            websocket: The WebSocket connection to accept.
            player_id: The unique identifier of the connecting player.
            players_state: The current game state to broadcast on connect.
            chats: The chat history to broadcast on connect.

        Raises:
            ValueError: If neither players_state nor chats is provided.
        """
        await websocket.accept()
        self.active_connections[player_id] = websocket
        if players_state is not None:
            await self.broadcast(player_id, {'action': 'connect', 'players': players_state})
        elif chats is not None:
            await self.broadcast(player_id, chats)
        else:
            raise ValueError("Either players_state or chats must be provided")

    def disconnect(self, player_id: UUID):
        """Remove a player's WebSocket connection from the active connections.

        Args:
            player_id: The unique identifier of the disconnecting player.
        """
        self.active_connections.pop(player_id, None)

    async def send_personal_message(self, player_id: UUID, message: dict | list):
        """Send a message to a specific player's WebSocket connection.

        Args:
            player_id: The unique identifier of the target player.
            message: The JSON-serializable message to send.

        Raises:
            ValueError: If no active connection exists for the given player ID.
        """
        connection = self.active_connections.get(player_id)
        if connection is None:
            raise ValueError(f"No active connection for player ID: {player_id}")

        await connection.send_json(message)

    async def broadcast(self, sender: UUID, message: dict | list):
        """Broadcast a message to all connected players except the sender.

        Args:
            sender: The unique identifier of the player sending the message.
            message: The JSON-serializable message to broadcast.
        """
        print("MESSAGE:", message)
        for id, connection in self.active_connections.items():
            if id != sender:
                await connection.send_json(message)

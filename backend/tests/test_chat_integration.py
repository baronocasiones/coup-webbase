"""Integration tests for the chat REST endpoints (GET /chats, POST /chat)."""
import pytest
from uuid import uuid4

pytestmark = pytest.mark.integration


class TestGetChats:
    """Tests for GET /chats."""

    def test_get_chats_empty(self, client):
        """No chats initially."""
        resp = client.get("/chats")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_chats_after_posting(self, client):
        """Chats appear after POST /chat."""
        chat_payload = {
            "userId": str(uuid4()),
            "sender_username": "Alice",
            "message": "Hello!",
        }
        client.post("/chat", json=chat_payload)

        resp = client.get("/chats")
        assert resp.status_code == 200
        chats = resp.json()
        assert len(chats) == 1
        assert chats[0]["message"] == "Hello!"
        assert chats[0]["sender_username"] == "Alice"


class TestPostChat:
    """Tests for POST /chat."""

    def test_post_chat_returns_201(self, client):
        """Successful POST returns 201 and the updated chat list."""
        chat_payload = {
            "userId": str(uuid4()),
            "sender_username": "Bob",
            "message": "First message",
        }
        resp = client.post("/chat", json=chat_payload)
        assert resp.status_code == 201

    def test_post_chat_returns_chat_list(self, client):
        """Response body contains the list of all chats."""
        uid = str(uuid4())
        chat_payload = {
            "userId": uid,
            "sender_username": "Bob",
            "message": "First message",
        }
        resp = client.post("/chat", json=chat_payload)
        body = resp.json()
        assert isinstance(body, list)
        assert any(c["message"] == "First message" for c in body)

    def test_post_multiple_chats(self, client):
        """Multiple chats accumulate in order."""
        uid = str(uuid4())
        for i in range(3):
            client.post("/chat", json={
                "userId": uid,
                "sender_username": "User",
                "message": f"msg-{i}",
            })

        resp = client.get("/chats")
        chats = resp.json()
        assert len(chats) == 3
        messages = [c["message"] for c in chats]
        assert messages == ["msg-0", "msg-1", "msg-2"]

    def test_post_chat_missing_field_returns_422(self, client):
        """Missing required field triggers validation error."""
        resp = client.post("/chat", json={"userId": str(uuid4())})
        assert resp.status_code == 422

    def test_post_chat_empty_body_returns_422(self, client):
        """Empty body triggers validation error."""
        resp = client.post("/chat", json={})
        assert resp.status_code == 422

    def test_post_chat_invalid_user_id_returns_422(self, client):
        """Non-UUID userId triggers validation error."""
        resp = client.post("/chat", json={
            "userId": "not-a-uuid",
            "sender_username": "Alice",
            "message": "Hi",
        })
        assert resp.status_code == 422

    def test_post_chat_special_characters_in_message(self, client):
        """Special characters in message are preserved."""
        chat_payload = {
            "userId": str(uuid4()),
            "sender_username": "Alice",
            "message": "<script>alert('xss')</script> & \"quotes\"",
        }
        resp = client.post("/chat", json=chat_payload)
        assert resp.status_code == 201
        chats = client.get("/chats").json()
        assert chats[0]["message"] == chat_payload["message"]

    def test_post_chat_long_message(self, client):
        """Very long messages are accepted."""
        chat_payload = {
            "userId": str(uuid4()),
            "sender_username": "Alice",
            "message": "A" * 5000,
        }
        resp = client.post("/chat", json=chat_payload)
        assert resp.status_code == 201

    def test_post_chat_sender_username_preserved(self, client):
        """sender_username is stored and returned."""
        chat_payload = {
            "userId": str(uuid4()),
            "sender_username": "SpecificName",
            "message": "test",
        }
        client.post("/chat", json=chat_payload)
        chats = client.get("/chats").json()
        assert chats[0]["sender_username"] == "SpecificName"


class TestChatEndToEnd:
    """End-to-end chat scenarios."""

    def test_full_chat_flow(self, client):
        """Add multiple players, send chats, verify state."""
        # Add players
        p1 = client.post("/player?player_name=Alice").json()
        p2 = client.post("/player?player_name=Bob").json()

        # Send chats from each player
        client.post("/chat", json={
            "userId": p1["id"],
            "sender_username": "Alice",
            "message": "Hello everyone!",
        })
        client.post("/chat", json={
            "userId": p2["id"],
            "sender_username": "Bob",
            "message": "Hey Alice!",
        })

        # Verify
        chats = client.get("/chats").json()
        assert len(chats) == 2
        assert chats[0]["sender_username"] == "Alice"
        assert chats[1]["sender_username"] == "Bob"

    def test_chat_after_player_removed(self, client):
        """Chat from a removed player's ID still works (chat is decoupled from player lifecycle)."""
        p1 = client.post("/player?player_name=临时").json()
        client.delete(f"/player?user_id={p1['id']}")

        # Chat from the removed player's ID - should still be accepted
        resp = client.post("/chat", json={
            "userId": p1["id"],
            "sender_username": "ghost",
            "message": "I still exist!",
        })
        # The lobby controller delegates to game.add_chat which doesn't check player existence
        assert resp.status_code == 201

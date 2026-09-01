import pytest
from uuid import uuid4
from services.Player import Player
from services.CoupGame import CoupGame
from controllers.LobbyController import LobbyController
from utils.exceptions import SynchronizationError, PlayerNotFoundError


pytestmark = pytest.mark.unit


@pytest.fixture
def lobby():
    """Create a fresh lobby with a game instance."""
    lobby = LobbyController()
    game = CoupGame()
    lobby.set_game(game)
    return lobby


@pytest.fixture
def sample_players():
    """Create sample players for testing."""
    return [
        Player("Alice"),
        Player("Bob"),
        Player("Charlie"),
    ]


class TestLobbyControllerPlayerManagement:
    """Test player management in LobbyController."""

    def test_add_player_success(self, lobby, sample_players):
        """Test adding a player to the lobby."""
        player = sample_players[0]
        lobby.add_player(player)
        retrieved_player = lobby.get_player_by_id(player.id)
        assert retrieved_player.name == "Alice"
        assert retrieved_player.id == player.id

    def test_add_multiple_players(self, lobby, sample_players):
        """Test adding multiple players."""
        for player in sample_players:
            lobby.add_player(player)
        players = lobby.get_players()
        assert len(players) == 3
        assert all(p.name in ["Alice", "Bob", "Charlie"] for p in players)

    def test_remove_player_success(self, lobby, sample_players):
        """Test removing a player from the lobby."""
        player = sample_players[0]
        lobby.add_player(player)
        assert len(lobby.get_players()) == 1
        lobby.remove_player(player.id)
        assert len(lobby.get_players()) == 0

    def test_get_player_by_id_not_found(self, lobby):
        """Test getting a non-existent player."""
        with pytest.raises(PlayerNotFoundError):
            lobby.get_player_by_id(uuid4())

    def test_get_players_empty_lobby(self, lobby):
        """Test getting players from empty lobby."""
        players = lobby.get_players()
        assert players == []

    def test_remove_player_no_game(self):
        """Test removing player when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.remove_player(uuid4())


class TestLobbyControllerPlayerStateUpdates:
    """Test player state management."""

    def test_toggle_player_ready(self, lobby, sample_players):
        """Test toggling player ready state."""
        player = sample_players[0]
        lobby.add_player(player)
        assert not player.isReady
        lobby.update_players_state(player.id)
        assert player.isReady
        lobby.update_players_state(player.id)
        assert not player.isReady

    def test_update_multiple_players_state(self, lobby, sample_players):
        """Test updating state of multiple players."""
        for player in sample_players:
            lobby.add_player(player)
        
        # Toggle first player
        lobby.update_players_state(sample_players[0].id)
        assert sample_players[0].isReady
        assert not sample_players[1].isReady
        
        # Toggle second player
        lobby.update_players_state(sample_players[1].id)
        assert sample_players[0].isReady
        assert sample_players[1].isReady


class TestLobbyControllerGameManagement:
    """Test game management in LobbyController."""

    def test_start_game_success(self, lobby, sample_players):
        """Test starting a game with minimum players."""
        for player in sample_players[:2]:
            lobby.add_player(player)
        
        lobby.start_game()
        assert lobby.game.state.name == "WAITING_FOR_ACTION"

    def test_start_game_insufficient_players(self, lobby, sample_players):
        """Test starting game with insufficient players."""
        lobby.add_player(sample_players[0])
        with pytest.raises(Exception):  # PlayerInsufficientError
            lobby.start_game()

    def test_set_game(self):
        """Test setting a game in lobby."""
        lobby = LobbyController()
        game = CoupGame()
        lobby.set_game(game)
        assert lobby.game == game


class TestLobbyControllerChat:
    """Test chat management in LobbyController."""

    def test_get_empty_chats(self, lobby):
        """Test getting chats from empty list."""
        chats = lobby.get_game_chats()
        assert chats == []

    def test_add_chat_message(self, lobby, sample_players):
        """Test adding a chat message."""
        player = sample_players[0]
        lobby.add_player(player)
        
        chat_message = {
            "userId": player.id,
            "message": "Hello!",
            "timestamp": 1234567890,
        }
        lobby.add_game_chat(chat_message)
        chats = lobby.get_game_chats()
        assert len(chats) == 1
        assert chats[0]["message"] == "Hello!"

    def test_get_last_chat(self, lobby, sample_players):
        """Test getting the last chat message."""
        player = sample_players[0]
        lobby.add_player(player)
        
        chat_message = {
            "userId": player.id,
            "message": "First message",
            "timestamp": 1234567890,
        }
        lobby.add_game_chat(chat_message)
        
        last_chat = lobby.get_game_last_chat()
        assert last_chat["message"] == "First message"

    def test_get_last_chat_empty(self, lobby):
        """Test getting last chat when no messages exist."""
        last_chat = lobby.get_game_last_chat()
        assert last_chat is None

    def test_add_multiple_chat_messages(self, lobby, sample_players):
        """Test adding multiple chat messages in order."""
        player1 = sample_players[0]
        player2 = sample_players[1]
        lobby.add_player(player1)
        lobby.add_player(player2)
        
        # Messages must be added with increasing timestamps
        for i in range(3):
            chat_message = {
                "userId": player1.id if i % 2 == 0 else player2.id,
                "message": f"Message {i}",
                "timestamp": 1000 + i,
            }
            lobby.add_game_chat(chat_message)
        
        chats = lobby.get_game_chats()
        assert len(chats) == 3
        assert chats[-1]["message"] == "Message 2"


class TestLobbyControllerErrorHandling:
    """Test error handling in LobbyController."""

    def test_add_player_no_game_set(self):
        """Test adding player when no game is set."""
        lobby = LobbyController()
        player = Player("Test")
        with pytest.raises(SynchronizationError):
            lobby.add_player(player)

    def test_get_players_no_game_set(self):
        """Test getting players when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.get_players()

    def test_get_player_by_id_no_game_set(self):
        """Test getting player when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.get_player_by_id(uuid4())

    def test_start_game_no_game_set(self):
        """Test starting game when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.start_game()

    def test_add_chat_no_game_set(self):
        """Test adding chat when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.add_game_chat({"message": "test"})

    def test_get_chats_no_game_set(self):
        """Test getting chats when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.get_game_chats()

    def test_get_last_chat_no_game_set(self):
        """Test getting last chat when no game is set."""
        lobby = LobbyController()
        with pytest.raises(SynchronizationError):
            lobby.get_game_last_chat()


class TestLobbyControllerIntegration:
    """Integration tests for LobbyController."""

    def test_complete_lobby_flow(self, lobby, sample_players):
        """Test complete lobby flow from join to game start."""
        # Players join
        for player in sample_players[:2]:
            lobby.add_player(player)
        
        assert len(lobby.get_players()) == 2
        
        # Players toggle ready
        for player in sample_players[:2]:
            lobby.update_players_state(player.id)
        
        assert all(p.isReady for p in lobby.get_players())
        
        # Start game
        lobby.start_game()
        assert lobby.game.state.name == "WAITING_FOR_ACTION"
        
        # Each player should have 2 cards
        for player in lobby.get_players():
            assert len(player.cards) == 2

    def test_player_chat_during_lobby(self, lobby, sample_players):
        """Test players sending chat messages during lobby."""
        for player in sample_players[:2]:
            lobby.add_player(player)
        
        # Add chat messages
        for i, player in enumerate(sample_players[:2]):
            chat = {
                "userId": player.id,
                "message": f"{player.name} speaks",
                "timestamp": 1000 + i,
            }
            lobby.add_game_chat(chat)
        
        chats = lobby.get_game_chats()
        assert len(chats) == 2
        assert "Alice speaks" in chats[0]["message"]
        assert "Bob speaks" in chats[1]["message"]

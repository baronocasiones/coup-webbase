from uuid import UUID, uuid4
from utils.exceptions import SynchronizationError
from typing import Optional
from utils import globals
from utils.exceptions import PlayerInsufficientError

from .Player import Player
from .GameState import GameState
from .GameAction import GameAction
from .BlockMove import BlockMove
from .Card import Card

from .actions.assassinate import Assassinate
from .actions.coup import Coup
from .actions.exchange import Exchange
from .actions.income import Income
from .actions.foreign_aid import ForeignAid
from .actions.tax import Tax
from .actions.steal import Steal


class CoupGame:
    def __init__(self) -> None:
        self.court_deck: Card = Card()
        self.players: list[Player] = []
        self.game_id: UUID = uuid4()
        # self.move_logs: list[Logs] = []
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
        self.chats: list[dict] = []
        self.move_target_id: Optional[UUID]
        self.blocker_id: Optional[UUID]
        self.challenger_id: Optional[UUID]

        # Current turn state
        self.current_player_index: int = 0
        self.declared_move: Optional[GameAction] = None
        self.declared_block: Optional[BlockMove]
        # not yet sure if needed
        # self.players_who_can_challenge: List[UUID] = []
        # Challenge state
        self.challenge_loser: Optional[Player]

        self.move_handler = {
            GameAction.INCOME: Income(),
            GameAction.FOREIGN_AID: ForeignAid(),
            GameAction.TAX: Tax(),
            GameAction.STEAL: Steal(),
            GameAction.ASSASSINATE: Assassinate(),
            GameAction.COUP: Coup(),
            GameAction.EXCHANGE: Exchange()
        }

    def get_court_deck(self) -> Card:
        return self.court_deck

    def get_move_target(self) -> Player | None:
        """
        Retrieve the target player for the current move, if any.
        """
        if self.move_target_id is None:
            return None
        return self.get_player_by_id(self.move_target_id)

    def add_chat(self, chat_message: dict) -> None:
        """
        Add a chat message to the game's chat log.
        """
        chat_message_timestamp = chat_message.get("timestamp", None)
        if not self.chats:
            self.chats.append(chat_message)
            return

        last_timestamp = self.chats[-1].get('timestamp')
        if last_timestamp is not None and\
                chat_message_timestamp is not None and\
                last_timestamp <= chat_message_timestamp:
            self.chats.append(chat_message)
        else:
            raise SynchronizationError(
                f"""
                Chat message timestamp ({chat_message_timestamp}) is older than the
                latest message ({last_timestamp}).
                """
            )

    def remove_player(self, player_id: UUID) -> None:
        """
        Remove a player from the game by their ID.
        """
        self.players = [player for player in self.players if player.id != player_id]

    def update_players_state(
            self,
            updated_players_state: Optional[list[Player]] = None,
            update_player: Optional[Player] = None
    ) -> None:
        """
        Update the state of players in the game.
        If given a list of player states, it replaces the entire players list.
        If given a single player, it updates that player's state in the
        existing list.
        """
        if update_player:
            for idx, player in enumerate(self.players):
                if player.id == update_player.id:
                    self.players[idx] = update_player
                    break
        elif updated_players_state:
            self.players = updated_players_state
        else:
            raise ValueError("Either updated_players_state or update_player must be provided.")

    def add_player(self, new_player: Player) -> None:
        """
        Add a player to the game.
        Returns:
            Player object if successful, None if game mfull or started
        """
        # TODO: need to raise exception instead of returning None
        if self.state != GameState.WAITING_FOR_PLAYERS:
            raise SynchronizationError("Cannot join a when game its already running.")

        if len(self.players) >= globals.MAX_PLAYERS:
            raise ValueError("Maximum player reached.")

        self.players.append(new_player)

    def get_player_by_id(self, player_id: UUID) -> Player | None:
        """Retrieve a player by their ID."""
        for player in self.players:
            if player.id == player_id:
                return player
        raise ValueError("Player not found")

    # start the game when there are 2 or more players in the lobby/room (min 2, max 6)
    def start_game(self) -> None:
        """
        Start the game if enough players are present.

        Raises:
            PlayerInsufficientError: If there are not enough players to start the game.
        state transitions to WAITING_FOR_ACTION
        """
        if len(self.players) < globals.MIN_PLAYERS:
            raise PlayerInsufficientError(
                f"Not enough players to start the game. Minimum {globals.MIN_PLAYERS} players required."
            )
        self.state = GameState.WAITING_FOR_ACTION
        self._deal_initial_cards()

    def _deal_initial_cards(self) -> None:
        """
        Deal initial cards to players at the start of the game.
        Each player receives 2 cards from the court deck.
        """
        cards_per_player = 2
        for _ in range(cards_per_player):
            for player in self.players:
                card = self.court_deck.draw_card()
                if card is None:
                    raise ValueError("Not enough cards in the court deck to deal to players.")
                player.add_card(card)

    def declare_move(
            self,
            player_id: UUID,
            move: GameAction | BlockMove,
            target_id: Optional[UUID],
            blocker_id: Optional[UUID]
    ) -> None:
        """
        Handle a player's declared move.
        Raises:
            SynchronizationError: If it's not the player's
            turn and make a GameAction move or the game is not in a state
            to accept moves.
        """

        current_player = self.get_current_player()
        # ERROR GUARDS
        if isinstance(move, GameAction) and current_player.id != player_id:
            raise SynchronizationError("It's not this player's turn.")
        if isinstance(move, BlockMove) and current_player.id == player_id:
            raise SynchronizationError("Current player cannot block their own move.")
        if self.state != GameState.WAITING_FOR_ACTION:
            raise SynchronizationError("Game is not in a state to accept moves.")

        if isinstance(move, BlockMove) and self.declared_move is not None and not self.declared_move.is_blockable():
            raise ValueError("This move cannot be blocked.")

        # LOGIC
        if isinstance(move, GameAction) and move.is_targetable():
            if target_id is None:
                raise ValueError("Target player ID must be provided for targetable moves.")
            self.move_target_id = target_id

        if isinstance(move, GameAction):
            self.state = GameState.ACTION_DECLARED
            self.declared_move = move
        elif isinstance(move, BlockMove):
            self.state = GameState.BLOCK_DECLARED
            self.declared_block = move
            self.blocker_id = blocker_id
        else:
            raise ValueError("Invalid move type.")

    # process challenges to declared moves
    def handle_challenge(self, card_to_remove: int) -> None:
        """
        Handle the challenge resolution.
        Raises:
            SynchronizationError: If the game is not in a state to handle challenges.
        """
        if self.state != GameState.CHALLENGE_HANDLE:
            raise SynchronizationError("Game is not in a state to handle challenges.")

        if self.challenge_loser is None:
            raise ValueError("No challenge loser set.")

        # Remove the challenged card from the loser
        self.challenge_loser.remove_card(card_to_remove)

        # Reset challenge state
        self.next_turn()

    def get_current_player(self) -> Player:
        """
        Retrieve the current player whose turn it is.
        """
        return self.players[self.current_player_index]

    def get_challenge_loser(self, challenger_id: UUID) -> UUID:
        """
        Get the ID of the player who loses the challenge.
        """
        if not isinstance(challenger_id, UUID):
            raise ValueError('challenger_id should be a type UUID')
        if isinstance(self.declared_move, GameAction) and not self.declared_move.is_challengeable():
            raise ValueError("Declared move cannot be challenged.")

        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError('Player cannot challenge in this time.')

        current_player = self.get_current_player()
        challenger_player = self.get_player_by_id(challenger_id)
        self.challenger_id = challenger_id

        if challenger_player is None:
            raise ValueError("Challenger player not found.")

        if self.declared_move not in current_player.moves:
            current_player.is_lying = True

        self.state = GameState.CHALLENGE_HANDLE
        if current_player.is_lying:
            self.challenge_loser = current_player
            return current_player.id
        else:
            self.challenge_loser = challenger_player
            return challenger_id

    def handle_no_challenge(self) -> None:
        """
        Handle the scenario where no challenge is made against the declared move.
        """
        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError("Cannot proceeed without a declared move.")

        # Proceed to execute the declared move
        self.perform_action()
        self.next_turn()

    def next_turn(self) -> None:
        """
        Advance to the next player's turn and reset the game and players state.
        """
        if any(len(player.cards) == 0 for player in self.players):
            raise SynchronizationError("Cannot proceed to next turn: a player has no cards left.")

        if len(self.players) == 1:
            self.state = GameState.GAME_OVER
            return

        self.current_player_index = (self.current_player_index + 1) % len(self.players)
        self.state = GameState.WAITING_FOR_ACTION
        self.declared_move = None
        self.challenge_loser = None
        self.move_target_id = None
        self.challenger_id = None
        self.blocker_id = None
        for player in self.players:
            player.is_lying = False

    def perform_action(self) -> None:
        """
        Execute the declared action by the current player.
        """

        if self.declared_move is None:
            raise ValueError("No declared move to perform.")

        action_handler = self.move_handler.get(self.declared_move)
        if action_handler is None:
            raise ValueError("No handler found for the declared move.")

            action_handler.execute(self)

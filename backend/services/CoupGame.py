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
from .Influence import Influence

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
        self.players: dict[UUID, Player] = {}
        self.game_id: UUID = uuid4()
        # self.move_logs: list[Logs] = []
        self.state: GameState = GameState.WAITING_FOR_PLAYERS
        self.chats: list[dict] = []
        self.move_target_id: Optional[UUID] = None
        self.blocker_id: Optional[UUID] = None 
        self.challenger_id: Optional[UUID] = None

        # Current turn state
        self.currentTurnIndex: int = 0
        self.declared_move: Optional[GameAction] = None
        self.declared_block: Optional[BlockMove] = None
        # not yet sure if needed
        # self.players_who_can_challenge: List[UUID] = []
        # Challenge state
        self.challenge_loser: Optional[Player] = None

        # Two-phase action state
        self.pending_influence_target: Optional[UUID] = None
        self.exchange_cards: Optional[list[Influence]] = None

        self.move_handler = {
            GameAction.INCOME: Income(),
            GameAction.FOREIGN_AID: ForeignAid(),
            GameAction.TAX: Tax(),
            GameAction.STEAL: Steal(),
            GameAction.ASSASSINATE: Assassinate(),
            GameAction.COUP: Coup(),
            GameAction.EXCHANGE: Exchange()
        }

    def get_game_state(self) -> GameState:
        return self.state

    def get_court_deck(self) -> Card:
        return self.court_deck

    def get_cards_in_deck(self) -> int:
        return len(self.court_deck.card_stack)

    def get_players(self) -> list[Player]:
        return list(self.players.values())

    def get_declared_move(self) -> GameAction | None:
        return self.declared_move

    def get_declared_block(self) -> BlockMove | None:
        return self.declared_block  

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

        last_timestamp = self.chats[-1].get("timestamp")
        if last_timestamp is None or chat_message_timestamp is None:
            self.chats.append(chat_message)
        elif last_timestamp <= chat_message_timestamp:
            self.chats.append(chat_message)
        else:
            raise SynchronizationError(
                f"Chat message timestamp ({chat_message_timestamp}) is older than "
                f"the latest message ({last_timestamp})."
            )

    def remove_player(self, player_id: UUID) -> None:
        """
        Remove a player from the game by their ID.
        """
        self.players.pop(player_id, None)

    def update_players_state(
            self,
            updated_players_state: Optional[list[Player]] = None,
            update_player: Optional[Player] = None
    ) -> None:
        # TODO: need to separate update_player and updated_players_state into two different methods
        """
        Update the state of players in the game.
        If given a list of player states, it replaces the entire players list.
        If given a single player, it updates that player's state in the
        existing list.
        """
        if update_player is not None:
            player_id = update_player.id
            player_to_update = self.players.get(player_id)
            if player_to_update is None:
                raise ValueError("Player not found in the game.")

            self.players[player_id] = update_player

        elif updated_players_state is not None:
            self.players = {player.id: player for player in updated_players_state}
        else:
            raise ValueError("Either updated_players_state or update_player must be provided.")

    def add_player(self, new_player: Player) -> None:
        """
        Add a player to the game.
        Returns:
            Player object if successful, None if game mfull or started
        Raises:
            SynchronizationError: If the game has already started.
        """
        # TODO: need to raise exception instead of returning None
        if self.state != GameState.WAITING_FOR_PLAYERS:
            raise SynchronizationError("Cannot join a when game its already running.")

        if len(self.players) >= globals.MAX_PLAYERS:
            raise ValueError("Maximum player reached.")

        self.players[new_player.id] = new_player

    def get_player_by_id(self, player_id: UUID) -> Player | None:
        """Retrieve a player by their ID."""
        return self.players.get(player_id)

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
            for player in self.players.values():
                card = self.court_deck.draw_card()
                if card is None:
                    raise ValueError("Not enough cards in the court deck to deal to players.")
                player.add_card(card)

    def declare_move(
            self,
            player_id: UUID,
            move: GameAction | BlockMove,
            target_id: Optional[UUID] = None,
            blocker_id: Optional[UUID] = None
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

        # State guards: GameAction requires WAITING_FOR_ACTION, BlockMove requires ACTION_DECLARED
        if isinstance(move, GameAction) and self.state != GameState.WAITING_FOR_ACTION:
            raise SynchronizationError(
                f"Game is not in a state to accept actions. current state: {self.state}"
            )
        if isinstance(move, BlockMove) and self.state != GameState.ACTION_DECLARED:
            raise SynchronizationError(
                f"Can only block when an action has been declared. current state: {self.state}"
            )

        if isinstance(move, BlockMove) and self.declared_move is not None and not self.declared_move.is_blockable():
            raise ValueError("This move cannot be blocked.")

        # Forced coup at 10+ coins
        if isinstance(move, GameAction) and move != GameAction.COUP:
            if current_player.coins >= globals.COUP_THRESHOLD:
                raise SynchronizationError(
                    f"You have {current_player.coins} coins and must coup."
                )

        # LOGIC
        if move == GameAction.INCOME: 
            self.declared_move = move
            self.perform_action()
            self.next_turn()
            return

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
    def handle_challenge(self, card_to_remove: Influence) -> None:
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
        """Retrieve the current player whose turn it is."""
        players = list(self.players.values())
        if not 0 <= self.currentTurnIndex < len(players):
            raise IndexError(
                f"current_player_index {self.currentTurnIndex} "
                f"out of range for {len(players)} players"
            )
        return players[self.currentTurnIndex]

    def get_challenge_loser(self, challenger_id: Optional[UUID] = None) -> UUID | None:
        """
        Get the ID of the player who loses the challenge.
        When state is ACTION_DECLARED, challenges the original actor.
        When state is BLOCK_DECLARED, challenges the blocker.
        """
        if challenger_id is None:
            return None
        if not isinstance(challenger_id, UUID):
            raise ValueError('challenger_id should be a type UUID')

        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError('Player cannot challenge in this state.')

        challenger_player = self.get_player_by_id(challenger_id)
        self.challenger_id = challenger_id

        if challenger_player is None:
            raise ValueError("Challenger player not found.")

        if self.state == GameState.BLOCK_DECLARED:
            # Challenge targets the blocker
            blocker = self.get_player_by_id(self.blocker_id)
            if blocker is None:
                raise ValueError("Blocker not found.")
            if self.declared_block not in blocker.moves:
                blocker.is_lying = True
            self.state = GameState.CHALLENGE_HANDLE
            if blocker.is_lying:
                self.challenge_loser = blocker
                return blocker.id
            else:
                self.challenge_loser = challenger_player
                return challenger_id

        # ACTION_DECLARED path — challenge the original actor
        if isinstance(self.declared_move, GameAction) and not self.declared_move.is_challengeable():
            raise ValueError("Declared move cannot be challenged.")

        current_player = self.get_current_player()
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
        If a block was declared and not challenged, the action is cancelled.
        """
        if self.state not in [GameState.ACTION_DECLARED, GameState.BLOCK_DECLARED]:
            raise SynchronizationError("Cannot proceed without a declared move.")

        if self.state == GameState.BLOCK_DECLARED:
            # Block stands, action is cancelled
            self.next_turn()
            return

        # Proceed to execute the declared move
        self.perform_action()

        # Don't advance turn if action requires player input (card selection)
        if self.state not in (GameState.INFLUENCE_SELECTION_PENDING, GameState.PENDING_EXCHANGE):
            self.next_turn()

    def next_turn(self) -> None:
        """
        Advance to the next player's turn and reset the game and players state.
        Eliminates any players with 0 cards before advancing.
        """
        # Eliminate players with 0 cards
        eliminated = [pid for pid, p in self.players.items() if len(p.cards) == 0]
        for pid in eliminated:
            del self.players[pid]

        # Check win condition
        if len(self.players) <= 1:
            self.state = GameState.GAME_OVER
            return

        # Clamp turn index if needed (in case players were removed)
        if self.currentTurnIndex >= len(self.players):
            self.currentTurnIndex = 0

        self.currentTurnIndex = (self.currentTurnIndex + 1) % len(self.players)
        self.state = GameState.WAITING_FOR_ACTION
        self.declared_move = None
        self.declared_block = None
        self.challenge_loser = None
        self.move_target_id = None
        self.challenger_id = None
        self.blocker_id = None
        for player in self.players.values():
            player.is_lying = False

    def resolve_influence_selection(self, player_id: UUID, card_to_remove: Influence) -> None:
        """
        Handle the target player's choice of which influence card to lose.
        Called after INFLUENCE_SELECTION_PENDING state (Assassinate/Coup).
        """
        if self.state != GameState.INFLUENCE_SELECTION_PENDING:
            raise SynchronizationError("Game is not waiting for influence selection.")

        if self.pending_influence_target is None:
            raise ValueError("No pending influence target set.")

        if player_id != self.pending_influence_target:
            raise SynchronizationError("This player is not the target of the influence selection.")

        target_player = self.get_player_by_id(player_id)
        if target_player is None:
            raise ValueError("Target player not found.")

        target_player.remove_card(card_to_remove)
        self.pending_influence_target = None
        self.next_turn()

    def resolve_exchange(self, player_id: UUID, chosen_cards: list[Influence]) -> None:
        """
        Handle the current player's card selection for Exchange.
        Called after PENDING_EXCHANGE state.
        """
        if self.state != GameState.PENDING_EXCHANGE:
            raise SynchronizationError("Game is not waiting for exchange selection.")

        if self.exchange_cards is None:
            raise ValueError("No exchange cards available.")

        current_player = self.get_current_player()
        if player_id != current_player.id:
            raise SynchronizationError("Only the current player can select exchange cards.")

        from .actions.exchange import Exchange
        exchange_handler = Exchange()
        exchange_handler.phase_two(
            game=self,
            player_choice=chosen_cards,
            initial_player_card=current_player.get_cards(),
            combined_influences=self.exchange_cards,
        )

        self.exchange_cards = None
        self.next_turn()

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

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
from models.PlayerModel import PlayerModel

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

        # Game-over state. `final_standings` is None until a game ends, and
        # `_ended_roster` holds the full roster captured at that moment — the
        # eliminated players are deleted from `players` by `next_turn()`, so
        # without the snapshot there would be no way to seat them again for a
        # rematch or to show how the game finished.
        self.final_standings: Optional[list[PlayerModel]] = None
        self._ended_roster: dict[UUID, Player] = {}

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

        # Eligibility: a block answers being *hit*, so only the target of a
        # targeted action may block it. Without this the server took a block from
        # any player at the table, because the client was the only gate and the
        # client had no way to know who the target was.
        #
        # Deliberately NOT applied when the declared action is untargeted.
        # Foreign Aid is blockable and has no target, and in Coup any player may
        # block it — so there is nothing here to compare against, and gating on
        # the target would silently delete the third of three blockable actions.
        #
        # This says nothing about whether the blocker *holds* the influence. In
        # Coup you claim the card and reveal it only if challenged, so a block
        # the player cannot back is the bluff, and get_challenge_loser() is what
        # resolves it. Do not add a card-ownership check here.
        if (
            isinstance(move, BlockMove)
            and self.declared_move is not None
            and self.declared_move.is_targetable()
            and blocker_id != self.move_target_id
        ):
            raise SynchronizationError("Only the target of an action can block it.")

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
        # Snapshot the roster *before* the deletions. These are the only frames
        # in which an eliminated player still exists, and the game-over screen
        # needs them; after the `del` below they are gone.
        roster_before = list(self.players.values())

        # Eliminate players with 0 cards
        eliminated = [pid for pid, p in self.players.items() if len(p.cards) == 0]
        for pid in eliminated:
            del self.players[pid]

        # Clamp *after* the deletions, because the index is relative to a roster
        # that has just shrunk, and *before* the win check.
        #
        # `get_current_player()` indexes `list(self.players.values())`. With two
        # players and the second one eliminated, an index of 1 is in range while
        # the roster is whole and out of range once it is not — so a clamp placed
        # before the deletions silently does nothing, and a clamp placed after the
        # win check is never reached at all. Either way the finished game left a
        # stale index and every `get_game_states()` raised IndexError: a 500 on
        # GET /game-state, the one call the client makes to render a won game.
        if self.currentTurnIndex >= len(self.players):
            self.currentTurnIndex = 0

        # Check win condition
        if len(self.players) <= 1:
            self._record_final_standings(roster_before, {pid for pid in eliminated})
            # Kept so `return_to_lobby()` can seat the whole table again,
            # eliminated players included.
            self._ended_roster = {p.id: p for p in roster_before}
            self._clear_action_state(roster_before)
            self.state = GameState.GAME_OVER
            return

        self.currentTurnIndex = (self.currentTurnIndex + 1) % len(self.players)
        self.state = GameState.WAITING_FOR_ACTION
        self._clear_action_state()

    def _clear_action_state(self, roster: Optional[list[Player]] = None) -> None:
        """
        Forget everything about the action in progress.

        Called from both exits of `next_turn()`. It used to sit inline in the
        turn-advance path only, so a game that ended mid-action carried the last
        one into GAME_OVER: the declared move, the declared block, who blocked,
        who challenged, the target, the challenge loser and any `is_lying` flags
        all survived. A finished game was publishing the shape of an action
        nobody was taking.

        `roster` is the pre-deletion snapshot, which the game-over path passes
        because the eliminated players are no longer in `self.players` by then —
        and they are exactly the ones whose `is_lying` would otherwise be left
        set on objects a rematch is about to hand back to the lobby.
        """
        self.declared_move = None
        self.declared_block = None
        self.challenge_loser = None
        self.move_target_id = None
        self.challenger_id = None
        self.blocker_id = None
        self.pending_influence_target = None
        self.exchange_cards = None
        for player in (roster if roster is not None else list(self.players.values())):
            player.is_lying = False

    def _record_final_standings(
        self, roster: list[Player], eliminated_ids: set
    ) -> None:
        """
        Capture how the game ended, before the eliminated players are dropped.

        The roster is ordered winner first — the winner is whoever is still
        standing, which after the deletions is the single remaining player — and
        the rest keep table order behind them. Without this the game-over screen
        could only ever render one row, because `playersState` holds survivors
        only and a finished game has exactly one.
        """
        survivors = [p for p in roster if p.id not in eliminated_ids]
        knocked_out = [p for p in roster if p.id in eliminated_ids]
        # Knocked out with the most influence left is the better finish, so a
        # tie at zero cards is broken by coins.
        knocked_out.sort(key=lambda p: (-len(p.cards), -p.coins))
        self.final_standings = [
            self._standing_for(p, is_eliminated=False) for p in survivors
        ] + [self._standing_for(p, is_eliminated=True) for p in knocked_out]

    @staticmethod
    def _standing_for(player: Player, is_eliminated: bool) -> PlayerModel:
        return PlayerModel(
            name=player.name,
            id=player.id,
            isReady=player.isReady,
            numberOfCards=len(player.cards),
            coins=player.coins,
            isEliminated=is_eliminated,
        )

    def return_to_lobby(self) -> None:
        """
        End the game and put everyone back in the lobby ready to play again.

        A finished game had no way out. `add_player()` refuses anyone unless the
        state is WAITING_FOR_PLAYERS, and `GAME_OVER` is not that, so the winner
        who clicked "Back to Lobby" found a lobby holding one player, could not
        admit anyone, and could not start a game needing two. The only thing that
        cleared it was POST /test/reset, which 403s unless ENV=testing.

        Players are restored *by identity* from the snapshot taken when the game
        ended, so their UUIDs survive and a client holding `userId` in
        sessionStorage is still the same player afterwards. A rematch therefore
        needs no re-registration, and the eliminated players come back too — the
        table that just finished is the table that plays again.

        A fresh `Card()` matters as much as the state reset: the deck has been
        dealt from all game, and redealing from it would run the second game dry.

        Callable while a game is still running as well as after it ended, so the
        roster falls back to whoever is currently in the game when there is no
        finished game to restore from. Restoring only the snapshot would empty
        the room, which is how a live game would be silently disbanded.
        """
        roster = self._ended_roster or dict(self.players)
        for player in roster.values():
            player.reset()
        self.players = dict(roster)
        self.court_deck = Card()
        self.chats.clear()
        self.currentTurnIndex = 0
        self._clear_action_state()
        self.final_standings = None
        self._ended_roster = {}
        self.state = GameState.WAITING_FOR_PLAYERS

    def reset(self) -> None:
        """
        Return the game to a pristine, empty lobby.

        For tests and the /test/reset endpoint. Distinct from
        `return_to_lobby()`, which keeps the roster: this one empties it, and
        clears the chat, so a test run starts from nothing at all. Both are
        here so there is one definition of each and no third copy in a fixture.
        """
        self.court_deck = Card()
        self.players.clear()
        self.chats.clear()
        self.currentTurnIndex = 0
        self._clear_action_state()
        self.final_standings = None
        self._ended_roster = {}
        self.state = GameState.WAITING_FOR_PLAYERS

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

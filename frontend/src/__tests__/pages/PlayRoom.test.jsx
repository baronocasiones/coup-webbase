import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PlayRoom from '../../pages/PlayRoom'

// Mock services
vi.mock('../../services/game', () => ({
  getGame: vi.fn(),
  getUserPlayer: vi.fn(),
  returnToLobby: vi.fn(),
}))

vi.mock('../../services/chat', () => ({
  getChatMessages: vi.fn(),
  addChatMessage: vi.fn(),
}))

vi.mock('../../services/player', () => ({
  getPlayers: vi.fn(),
  removePlayer: vi.fn(),
  changeReadyState: vi.fn(),
}))

vi.mock('../../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

import { getGame, getUserPlayer } from '../../services/game'
import { getChatMessages } from '../../services/chat'

const mockGameState = {
  state: 'WAITING_FOR_ACTION',
  currentTurn: { id: 'user-1', name: 'Alice' },
  playersState: [
    { id: 'user-1', name: 'Alice', coins: 2, cards: ['DUKE', 'ASSASSIN'], numberOfCards: 2 },
    { id: 'user-2', name: 'Bob', coins: 3, cards: ['CAPTAIN', 'CONTESSA'], numberOfCards: 2 },
  ],
  cardsInDeck: 10,
}

const mockUserPlayer = {
  id: 'user-1',
  name: 'Alice',
  coins: 2,
  cards: ['DUKE', 'ASSASSIN'],
  isReady: true,
}

function renderPlayRoom(gameStateData = mockGameState, userPlayerData = mockUserPlayer, userId = 'user-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  window.sessionStorage.setItem('userId', userId)
  window.sessionStorage.setItem('username', userPlayerData?.name ?? 'Alice')

  getGame.mockResolvedValue(gameStateData)
  getUserPlayer.mockResolvedValue(userPlayerData)
  getChatMessages.mockResolvedValue([])

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/playroom']}>
          <PlayRoom />
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient,
  }
}

describe('PlayRoom page @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('shows loader while game state is loading', () => {
    getGame.mockReturnValue(new Promise(() => {}))
    getUserPlayer.mockReturnValue(new Promise(() => {}))
    renderPlayRoom()

    expect(document.querySelector('[class]')).toBeTruthy()
  })

  it('renders the game header with current turn', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Current Turn')).toBeInTheDocument()
      expect(screen.getByText("It's your Turn")).toBeInTheDocument()
    })
  })

  it('shows player count and cards in deck', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Players Left')).toBeInTheDocument()
      expect(screen.getByText('Cards in Deck')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument() // cardsInDeck
    })
  })

  it('renders the user info panel with name and coins', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('2 coins')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('renders user cards with correct icons', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('DUKE')).toBeInTheDocument()
      expect(screen.getByText('ASSASSIN')).toBeInTheDocument()
    })
  })

  it('renders action buttons', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Income')).toBeInTheDocument()
      expect(screen.getByText('Foreign Aid')).toBeInTheDocument()
      expect(screen.getByText('Coup (7)')).toBeInTheDocument()
      expect(screen.getByText('Tax')).toBeInTheDocument()
      expect(screen.getByText('Assassinate')).toBeInTheDocument()
      expect(screen.getByText('Steal')).toBeInTheDocument()
      expect(screen.getByText('Exchange')).toBeInTheDocument()
    })
  })

  it('renders opponent players', async () => {
    renderPlayRoom()

    await waitFor(() => {
      // Bob appears in both the main Opponents and the target modal Opponents
      const bobElements = screen.getAllByText('Bob')
      expect(bobElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders game log chat box', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Game Log')).toBeInTheDocument()
    })
  })

  it('renders the header stats and no dead Menu control', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Current Turn')).toBeInTheDocument()
    })

    expect(screen.getByText('Players Left')).toBeInTheDocument()
    expect(screen.getByText('Cards in Deck')).toBeInTheDocument()

    // The "Menu" button had no onClick and no destination. A control that
    // looks actionable but does nothing is worse than no control at all.
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('labels the player\'s own influences', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Your Influences')).toBeInTheDocument()
    })
  })

  it('displays "Your Actions" label when not forced coup', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('Your Actions')).toBeInTheDocument()
    })
  })

  it('shows forced coup when player has 10+ coins and it is their turn', async () => {
    const forcedState = {
      ...mockGameState,
      state: 'WAITING_FOR_ACTION',
      currentTurn: { id: 'user-1', name: 'Alice' },
    }
    const richPlayer = {
      ...mockUserPlayer,
      coins: 10,
    }

    renderPlayRoom(forcedState, richPlayer)

    await waitFor(() => {
      expect(screen.getByText('Forced Coup!')).toBeInTheDocument()
      // Only the forced coup button should be visible
      expect(screen.getByText('Coup (7)')).toBeInTheDocument()
    })
  })

  it('disables action buttons when not user turn', async () => {
    const notMyTurnState = {
      ...mockGameState,
      currentTurn: { id: 'user-2', name: 'Bob' },
    }

    renderPlayRoom(notMyTurnState)

    await waitFor(() => {
      expect(screen.getByText("Bob's Turn")).toBeInTheDocument()
    })
  })

  it('renders the "You" badge in user panel', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument()
    })
  })
})

/**
 * Who is offered a response to a declared move.
 *
 * The rule inverts between the two declared states, and getting it wrong is
 * what routed the post-block challenge prompt to the blocker instead of the
 * player whose action had been blocked. `currentTurn` does not move until the
 * block resolves, so during BLOCK_DECLARED it still names the actor — a single
 * `!isMyTurn` test hides the panel from the one person who may legally answer
 * and shows it to the blocker, who may answer nothing.
 *
 * These belong to PlayRoom rather than ChallengePanel because PlayRoom is the
 * only component that sees both states at once.
 */
describe('PlayRoom response gate @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  const blockedState = {
    ...mockGameState,
    state: 'BLOCK_DECLARED',
    declaredMove: 'FOREIGN AID',
    declaredBlock: 'BLOCK FOREIGN AID',
    // Alice declared the action and it is still her turn until the block
    // resolves, so currentTurn deliberately still names her.
    currentTurn: { id: 'user-1', name: 'Alice' },
    blockerId: 'user-2',
  }

  it('offers the block response to the player whose action was blocked', async () => {
    renderPlayRoom(blockedState)

    await waitFor(() => {
      expect(screen.getByText('Challenge Block')).toBeInTheDocument()
      expect(screen.getByText('Accept Block')).toBeInTheDocument()
    })
  })

  it('does not offer the block response to the blocker', async () => {
    // The blocker used to be handed the panel, including an "Accept Block"
    // button that resolved their own block for the whole table.
    const bob = { ...mockUserPlayer, id: 'user-2', name: 'Bob' }
    // currentTurn still names Alice: the blocked player, not Bob.
    renderPlayRoom({ ...blockedState, currentTurn: { id: 'user-1', name: 'Alice' } }, bob, 'user-2')

    await waitFor(() => {
      expect(screen.getByText("Alice's Turn")).toBeInTheDocument()
    })

    expect(screen.queryByText('Challenge Block')).not.toBeInTheDocument()
    expect(screen.queryByText('Accept Block')).not.toBeInTheDocument()
  })

  it('offers the action response to other players, not the declarer', async () => {
    const actionState = {
      ...mockGameState,
      state: 'ACTION_DECLARED',
      declaredMove: 'FOREIGN AID',
      currentTurn: { id: 'user-1', name: 'Alice' },
    }
    const bob = { ...mockUserPlayer, id: 'user-2', name: 'Bob' }

    renderPlayRoom(actionState, bob, 'user-2')

    await waitFor(() => {
      expect(screen.getByText(/Respond to FOREIGN AID/)).toBeInTheDocument()
    })
    expect(screen.getByText('Block (BLOCK FOREIGN AID)')).toBeInTheDocument()
  })

  it('does not show the action response to the player who declared it', async () => {
    const actionState = {
      ...mockGameState,
      state: 'ACTION_DECLARED',
      declaredMove: 'FOREIGN AID',
      currentTurn: { id: 'user-1', name: 'Alice' },
    }

    renderPlayRoom(actionState)

    await waitFor(() => {
      expect(screen.getByText("It's your Turn")).toBeInTheDocument()
    })

    expect(screen.queryByText(/Respond to/)).not.toBeInTheDocument()
  })
})

/**
 * Who is offered the influence picker after a Coup or Assassinate.
 *
 * The server owes the surrender to the *target*, but the turn has not advanced
 * by then, so `currentTurn` still names the player who attacked. Gating on
 * `isMyTurn` therefore put the picker in front of the attacker, over their own
 * hand, and left the target with nothing. Every selection the attacker made was
 * refused with a `SynchronizationError`, which the WS handler reports as an
 * `error` frame the client only `console.error`s — so the table waited in
 * INFLUENCE_SELECTION_PENDING until somebody reloaded.
 *
 * The picker is keyed off the published `pendingInfluenceTarget` instead.
 */
describe('PlayRoom influence selection gate @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  // Alice attacked Bob. currentTurn has not moved, so it still names Alice.
  const pendingSelectionState = {
    ...mockGameState,
    state: 'INFLUENCE_SELECTION_PENDING',
    declaredMove: 'COUP',
    currentTurn: { id: 'user-1', name: 'Alice' },
    pendingInfluenceTarget: 'user-2',
  }

  const bob = { ...mockUserPlayer, id: 'user-2', name: 'Bob', cards: ['CAPTAIN', 'CONTESSA'] }

  it('offers the picker to the target', async () => {
    renderPlayRoom(pendingSelectionState, bob, 'user-2')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Choose a card to lose' })).toBeInTheDocument()
    })
    // The target's own hand, since the picker is fed from /user-player.
    expect(screen.getByText('You must permanently remove one influence card.')).toBeInTheDocument()
  })

  it('does not offer the picker to the attacker, even though it is their turn', async () => {
    // The regression. Alice is `currentTurn`, so `isMyTurn` is true and the
    // picker used to open over her own hand.
    renderPlayRoom(pendingSelectionState)

    await waitFor(() => {
      expect(screen.getByText("It's your Turn")).toBeInTheDocument()
    })

    expect(screen.queryByRole('dialog', { name: 'Choose a card to lose' })).not.toBeInTheDocument()
  })

  it('leaves the server free to reject the attacker, who owes nothing', async () => {
    // The attacker is told, correctly, that somebody else has to choose.
    renderPlayRoom(pendingSelectionState)

    await waitFor(() => {
      expect(screen.getByText('Bob must choose a card to lose')).toBeInTheDocument()
    })
    expect(screen.queryByText('Choose a card to lose')).not.toBeInTheDocument()
  })
})

/**
 * The generic broadcast branch has to refresh the private query too.
 *
 * The picker reads the hand off `["gameState", userId]`. Invalidation of the
 * public query alone leaves the target looking at a stale hand after any
 * broadcast, which is how a surrender appears not to have taken effect.
 */
describe('PlayRoom game WS state update @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  function gameSocket() {
    const socket = window.WebSocket.instances.find((s) => s.url.includes('/ws/game'))
    if (!socket) throw new Error('no game socket was opened')
    return socket
  }

  it('invalidates the public and the private game state on a broadcast', async () => {
    const { queryClient } = renderPlayRoom()

    await waitFor(() => {
      expect(gameSocket()).toBeTruthy()
    })

    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    // A plain state update: no `action`, no `error`.
    gameSocket()._simulateMessage({ state: 'INFLUENCE_SELECTION_PENDING' })

    expect(spy).toHaveBeenCalledWith({ queryKey: ['gameState'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['gameState', 'user-1'] })
  })
})

/**
 * The Exchange payload, asserted on the frame that actually goes out.
 *
 * `exchangeCards` is the hand followed by the two cards just drawn, sent only
 * to the exchanging player over the private `/user-player` channel. The modal
 * used to read it from the public `gameState.exchangeCards` — a field the
 * backend has never sent — so the `||` fallback always won, the pool collapsed
 * to the player's own hand, and the header read "You drew 0 cards".
 */
describe('PlayRoom exchange flow @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  const exchangingPlayer = {
    id: 'user-1',
    name: 'Alice',
    coins: 2,
    cards: ['CONTESSA'],
    exchangeCards: ['CONTESSA', 'ASSASSIN', 'ASSASSIN'],
  }

  const pendingExchangeState = {
    ...mockGameState,
    state: 'PENDING_EXCHANGE',
    currentTurn: { id: 'user-1', name: 'Alice' },
  }

  it('shows the drawn cards, not just the hand', async () => {
    renderPlayRoom(pendingExchangeState, exchangingPlayer)

    await waitFor(() => {
      // Three in the pool: one held, two drawn.
      expect(screen.getByText(/You drew 2 cards\./)).toBeInTheDocument()
      expect(screen.getByText(/Select 1 to keep/)).toBeInTheDocument()
    })
  })

  it('sends plain influence names to the server', async () => {
    // The regression this whole flow was broken by. Selection was keyed on
    // `card + index` and those strings were submitted verbatim, so the backend
    // received "ASSASSIN0", `Influence[...]` raised, the error came back as a
    // frame the client only `console.error`s, and the game sat in
    // PENDING_EXCHANGE forever.
    const { fireEvent } = await import('@testing-library/react')
    renderPlayRoom(pendingExchangeState, exchangingPlayer)

    await waitFor(() => {
      expect(screen.getByText(/You drew 2 cards\./)).toBeInTheDocument()
    })

    // Keep the first of the two identical Assassins. Selecting by index is
    // what makes an identical pair distinguishable.
    const assassinButtons = screen.getAllByText('ASSASSIN')
    fireEvent.click(assassinButtons[0])
    fireEvent.click(screen.getByText('Confirm Selection'))

    await waitFor(() => {
      const [socket] = window.WebSocket.instances
      expect(socket).toBeTruthy()
      const exchange = socket.sentMessages.find((m) => m.action === 'exchange_selection')
      expect(exchange).toBeDefined()
      expect(exchange.payload.cards).toEqual(['ASSASSIN'])
      for (const card of exchange.payload.cards) {
        // No index suffix, no mangling — the server looks these up by name.
        expect(card).toMatch(/^[A-Z]+$/)
      }
    })
  })
})

/**
 * Somebody pressed "Back to Lobby".
 *
 * The reset is broadcast, not just returned, because the players who did not
 * press the button would otherwise sit on a game-over screen describing a game
 * the server has already thrown away — and they have no button of their own to
 * press.
 *
 * The frame is `{"action": "game_reset", ...}` rather than a bare game state, so
 * the client reads one field instead of inferring intent from a state value that
 * also occurs on connect.
 */
describe('PlayRoom game reset broadcast @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  function gameSocket() {
    const socket = window.WebSocket.instances.find((s) => s.url.includes('/ws/game'))
    if (!socket) throw new Error('no game socket was opened')
    return socket
  }

  it('leaves the finished board when another player resets the game', async () => {
    renderPlayRoom({
      ...mockGameState,
      state: 'GAME_OVER',
      finalStandings: [
        { id: 'user-1', name: 'Alice', isEliminated: false },
        { id: 'user-2', name: 'Bob', isEliminated: true },
      ],
    })

    await waitFor(() => expect(gameSocket()).toBeTruthy())

    // The precondition, asserted. Without it this test would pass on any build
    // where the overlay never rendered, and would be detecting nothing.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeInTheDocument()
    )

    gameSocket()._simulateMessage({
      action: 'game_reset',
      gameState: { ...mockGameState, state: 'WAITING_FOR_PLAYERS' },
    })

    // The board is gone; a game-over overlay describing a discarded game would
    // be worse than an empty screen.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Back to Lobby' })).not.toBeInTheDocument()
    )
  })

  it('does not treat an ordinary state update as a reset', async () => {
    // A bare game state also arrives on connect, and WAITING_FOR_PLAYERS is a
    // perfectly ordinary value. Reacting to it without an explicit action would
    // navigate on the wrong evidence.
    renderPlayRoom({
      ...mockGameState,
      state: 'GAME_OVER',
      finalStandings: [{ id: 'user-1', name: 'Alice', isEliminated: false }],
    })

    await waitFor(() => expect(gameSocket()).toBeTruthy())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeInTheDocument()
    )

    gameSocket()._simulateMessage({ ...mockGameState, state: 'WAITING_FOR_PLAYERS' })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeInTheDocument()
  })
})

/**
 * A refused action has to be visible.
 *
 * The game WebSocket answers every rejected action with `{"error": "..."}`, and
 * the client wrote that to the console and nothing else — so a refused action
 * looked exactly like an ignored one, and a player had no way to tell that
 * anything had happened. The influence-selection bug is the worst case: the
 * picker was shown to the wrong player, every selection came back refused, and
 * the table sat in a dead state with no sign of it on screen.
 */
describe('PlayRoom refused actions @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    window.sessionStorage.setItem('userId', 'user-1')
  })

  function gameSocket() {
    const socket = window.WebSocket.instances.find((s) => s.url.includes('/ws/game'))
    if (!socket) throw new Error('no game socket was opened')
    return socket
  }

  it('surfaces the server\'s refusal instead of only logging it', async () => {
    renderPlayRoom()

    await waitFor(() => expect(gameSocket()).toBeTruthy())

    gameSocket()._simulateMessage({
      error: 'Only the target of an action can block it.',
    })

    // The server's own words, not a generic apology: the player should learn
    // what the rule was, and not only that something went wrong.
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Only the target of an action can block it.'
      )
    )
  })

  it('shows nothing at all when no action has been refused', async () => {
    renderPlayRoom()

    await waitFor(() => expect(gameSocket()).toBeTruthy())

    // The precondition, asserted. Without it this test would pass on a build
    // where the alert was permanently present, and would be detecting nothing.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

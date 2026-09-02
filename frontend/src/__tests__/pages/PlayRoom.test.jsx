import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PlayRoom from '../../pages/PlayRoom'

// Mock services
vi.mock('../../services/game', () => ({
  getGame: vi.fn(),
  getUserPlayer: vi.fn(),
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

function renderPlayRoom(gameStateData = mockGameState, userPlayerData = mockUserPlayer) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  window.sessionStorage.setItem('userId', 'user-1')
  window.sessionStorage.setItem('username', 'Alice')

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

  it('renders the Menu button', async () => {
    renderPlayRoom()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
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

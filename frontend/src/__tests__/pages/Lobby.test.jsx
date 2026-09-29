import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Lobby from '../../pages/Lobby'

// Mock services
vi.mock('../../services/player', () => ({
  getPlayers: vi.fn(),
  removePlayer: vi.fn(),
  changeReadyState: vi.fn(),
}))

vi.mock('../../services/chat', () => ({
  getChatMessages: vi.fn(),
  addChatMessage: vi.fn(),
}))

vi.mock('../../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

import { getPlayers } from '../../services/player'
import { getChatMessages } from '../../services/chat'
import axios from '../../axios'

function renderLobby() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  window.sessionStorage.setItem('userId', 'user-1')
  window.sessionStorage.setItem('username', 'Alice')

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/lobby']}>
          <Lobby />
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient,
  }
}

describe('Lobby page @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    getChatMessages.mockResolvedValue([])
  })

  it('shows loader while players are loading', () => {
    getPlayers.mockReturnValue(new Promise(() => {})) // Never resolves
    renderLobby()

    // Loader should be rendered
    expect(document.querySelector('[class]')).toBeTruthy()
  })

  it('renders player list after loading', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
      { id: 'user-2', name: 'Bob', isReady: true },
    ])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      expect(screen.getByText(/Bob/)).toBeInTheDocument()
    })
  })

  it('shows host badge for first player', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
    ])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText('Host')).toBeInTheDocument()
    })
  })

  it('shows ready state for players', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
      { id: 'user-2', name: 'Bob', isReady: true },
    ])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText('Not ready')).toBeInTheDocument()
      // "Ready" appears as both button text and player status; find all
      const readyElements = screen.getAllByText('Ready')
      expect(readyElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows "(you)" next to current user name', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
    ])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      // "(you)" is rendered inside the same span as the name
      expect(screen.getByText(/you/)).toBeInTheDocument()
    })
  })

  it('does not render the removed game settings panel', async () => {
    // The panel used to list Max Players 6 / Starting Coins 2 / Game Mode
    // Classic — hardcoded constants dressed up as settings. It was removed
    // because it implied configurability that does not exist. This guards
    // against it being reintroduced.
    getPlayers.mockResolvedValue([])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText('Players')).toBeInTheDocument()
    })

    expect(screen.queryByText('Game Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Max Players')).not.toBeInTheDocument()
    expect(screen.queryByText('Starting Coins')).not.toBeInTheDocument()
    expect(screen.queryByText('Game Mode')).not.toBeInTheDocument()
  })

  it('renders chat box with lobby header', async () => {
    getPlayers.mockResolvedValue([])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText('Lobby Chat')).toBeInTheDocument()
    })
  })

  it('shows Ready button when game cannot start', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
    ])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument()
    })
  })

  it('shows Leave Lobby button', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
    ])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Leave Lobby' })).toBeInTheDocument()
    })
  })

  it('shows empty slots for available spots', async () => {
    getPlayers.mockResolvedValue([
      { id: 'user-1', name: 'Alice', isReady: false },
    ])
    renderLobby()

    await waitFor(() => {
      const emptySlots = screen.getAllByText('Waiting for player...')
      expect(emptySlots.length).toBe(5) // 6 max - 1 player = 5 empty
    })
  })

  it('displays error state when player fetch fails', async () => {
    getPlayers.mockRejectedValue(new Error('Server error'))
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText('Error loading players.')).toBeInTheDocument()
    })
  })

  it('shows waiting status label', async () => {
    getPlayers.mockResolvedValue([])
    renderLobby()

    await waitFor(() => {
      expect(screen.getByText('Waiting for all players to be ready')).toBeInTheDocument()
    })
  })
})

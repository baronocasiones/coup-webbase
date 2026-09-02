import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Landing from '../../pages/Landing'

// Mock axios
vi.mock('../../axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

import axios from '../../axios'

function renderLanding(route = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Landing />
        </MemoryRouter>
      </QueryClientProvider>
    ),
    queryClient,
  }
}

describe('Landing page @integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('renders the title and subtitle', () => {
    renderLanding()

    expect(screen.getByText('Coup')).toBeInTheDocument()
    expect(screen.getByText('The Game of Deception')).toBeInTheDocument()
  })

  it('renders the name input field', () => {
    renderLanding()

    expect(screen.getByPlaceholderText('Enter your name to join')).toBeInTheDocument()
  })

  it('renders the Join Game button', () => {
    renderLanding()

    expect(screen.getByRole('button', { name: 'Join Game' })).toBeInTheDocument()
  })

  it('renders the footer text', () => {
    renderLanding()

    expect(screen.getByText(/2-6 players/)).toBeInTheDocument()
  })

  it('clears sessionStorage on mount', () => {
    window.sessionStorage.setItem('userId', 'old-user')
    renderLanding()

    expect(window.sessionStorage.getItem('userId')).toBeNull()
  })

  it('does not submit when input is empty', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('button', { name: 'Join Game' }))
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('does not submit when input is only whitespace', async () => {
    const user = userEvent.setup()
    renderLanding()

    const input = screen.getByPlaceholderText('Enter your name to join')
    await user.type(input, '   ')
    await user.click(screen.getByRole('button', { name: 'Join Game' }))
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('submits player name on form submit', async () => {
    const user = userEvent.setup()
    axios.post.mockResolvedValue({ data: { id: 'user-1', name: 'Alice' } })
    renderLanding()

    const input = screen.getByPlaceholderText('Enter your name to join')
    await user.type(input, 'Alice')
    await user.click(screen.getByRole('button', { name: 'Join Game' }))

    expect(axios.post).toHaveBeenCalledWith('/player', null, { params: { player_name: 'Alice' } })
  })

  it('stores userId and username in sessionStorage on success', async () => {
    const user = userEvent.setup()
    axios.post.mockResolvedValue({ data: { id: 'user-1', name: 'Alice' } })
    renderLanding()

    const input = screen.getByPlaceholderText('Enter your name to join')
    await user.type(input, 'Alice')
    await user.click(screen.getByRole('button', { name: 'Join Game' }))

    await waitFor(() => {
      expect(window.sessionStorage.getItem('userId')).toBe('user-1')
      expect(window.sessionStorage.getItem('username')).toBe('Alice')
    })
  })

  it('logs error on failed submission', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    axios.post.mockRejectedValue(new Error('Server error'))
    renderLanding()

    const input = screen.getByPlaceholderText('Enter your name to join')
    await user.type(input, 'Alice')
    await user.click(screen.getByRole('button', { name: 'Join Game' }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })
    consoleSpy.mockRestore()
  })

  it('allows typing in the input field', async () => {
    const user = userEvent.setup()
    renderLanding()

    const input = screen.getByPlaceholderText('Enter your name to join')
    await user.type(input, 'Bob')

    expect(input).toHaveValue('Bob')
  })
})

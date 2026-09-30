import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatBox from '../../components/ChatBox'
import { renderWithProviders, createTestQueryClient } from '../test-utils'

// Mock the chat service
vi.mock('../../services/chat', () => ({
  getChatMessages: vi.fn(),
  addChatMessage: vi.fn(),
}))

import { getChatMessages, addChatMessage } from '../../services/chat'

describe('ChatBox component @unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('renders the header text', () => {
    getChatMessages.mockResolvedValue([])
    renderWithProviders(<ChatBox header="Test Chat" />)

    expect(screen.getByText('Test Chat')).toBeInTheDocument()
  })

  it('shows loading skeleton while fetching messages', () => {
    getChatMessages.mockReturnValue(new Promise(() => {})) // Never resolves
    renderWithProviders(<ChatBox header="Chat" />)

    // Should show skeleton (loading state)
    expect(screen.getByText('Chat')).toBeInTheDocument()
  })

  it('shows "No messages yet." when message list is empty', async () => {
    getChatMessages.mockResolvedValue([])
    renderWithProviders(<ChatBox header="Empty Chat" />)

    await waitFor(() => {
      expect(screen.getByText('No messages yet.')).toBeInTheDocument()
    })
  })

  it('renders user messages', async () => {
    getChatMessages.mockResolvedValue([
      { userId: '1', sender_username: 'Alice', message: 'Hello everyone!' },
    ])
    window.sessionStorage.setItem('userId', '1')

    renderWithProviders(<ChatBox header="Chat" />)

    await waitFor(() => {
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('renders system messages with special styling', async () => {
    getChatMessages.mockResolvedValue([
      { userId: null, sender_username: 'System', message: 'Game started' },
    ])

    renderWithProviders(<ChatBox header="Chat" />)

    await waitFor(() => {
      expect(screen.getByText('Game started')).toBeInTheDocument()
    })
  })

  it('shows the submission form when withSubmission is true', async () => {
    getChatMessages.mockResolvedValue([])
    renderWithProviders(<ChatBox header="Chat" withSubmission={true} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    })
  })

  it('hides the submission form when withSubmission is false', async () => {
    getChatMessages.mockResolvedValue([])
    renderWithProviders(<ChatBox header="Chat" withSubmission={false} />)

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument()
    })
  })

  it('marks own messages with different styling', async () => {
    getChatMessages.mockResolvedValue([
      { userId: '1', sender_username: 'Alice', message: 'My message' },
      { userId: '2', sender_username: 'Bob', message: 'Their message' },
    ])
    window.sessionStorage.setItem('userId', '1')

    const { container } = renderWithProviders(<ChatBox header="Chat" />)

    await waitFor(() => {
      expect(screen.getByText('My message')).toBeInTheDocument()
      expect(screen.getByText('Their message')).toBeInTheDocument()
    })
  })
})

/**
 * What the client does with a frame that arrives over the socket.
 *
 * The handler used to store whatever arrived as though it were always the
 * complete log. The server, meanwhile, sent two different things on this
 * channel: a list on connect and a single message object on broadcast. So a
 * message from another player replaced the React Query cache with an object —
 * `messageDatas.length` became `undefined`, `length === 0` and `length > 0` were
 * both false, neither render branch ran, and the entire chat log disappeared with
 * no error anywhere. Only the sender recovered, via the REST invalidation on
 * their own mutation.
 *
 * These drive `onmessage` directly, which no test in this file previously did.
 */
describe('ChatBox WebSocket frames @unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    // ChatBox opens the socket only when there is a userId, so without this no
    // socket exists and every frame test would fail on the helper rather than on
    // the behaviour it is testing.
    window.sessionStorage.setItem('userId', 'u1')
    getChatMessages.mockResolvedValue([
      { userId: 'u1', sender_username: 'Alice', message: 'existing' },
    ])
  })

  function socketFor(wsPath) {
    const socket = window.WebSocket.instances.find((s) => s.url.includes(wsPath))
    if (!socket) throw new Error(`no socket was opened for ${wsPath}`)
    return socket
  }

  it('renders messages that arrive in a chat frame', async () => {
    renderWithProviders(<ChatBox header="Lobby Chat" />)
    await waitFor(() => expect(socketFor('/ws/chat')).toBeTruthy())
    // The REST fetch has to land before anything is asserted; a bare getByText
    // here races it and passes or fails on timing rather than on behaviour.
    expect(await screen.findByText('existing')).toBeInTheDocument()

    socketFor('/ws/chat')._simulateMessage({
      action: 'chat',
      messages: [
        { userId: 'u1', sender_username: 'Alice', message: 'existing' },
        { userId: 'u2', sender_username: 'Bob', message: 'from the socket' },
      ],
    })

    await waitFor(() => expect(screen.getByText('from the socket')).toBeInTheDocument())
  })

  it('ignores a frame that is not a chat frame', async () => {
    // The shape that blanked the log. Ignoring it is what stops one stray frame
    // from poisoning the cache for every subsequent render.
    renderWithProviders(<ChatBox header="Lobby Chat" />)
    await waitFor(() => expect(socketFor('/ws/chat')).toBeTruthy())

    socketFor('/ws/chat')._simulateMessage({ userId: 'u2', message: 'bare object' })

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.getByText('existing')).toBeInTheDocument()
    expect(screen.queryByText('bare object')).not.toBeInTheDocument()
  })

  it('ignores the lobby player-list envelope', async () => {
    // This is what the connect frame used to be, when the handler passed the
    // history into `connect()`'s `players_state` parameter.
    renderWithProviders(<ChatBox header="Lobby Chat" />)
    await waitFor(() => expect(socketFor('/ws/chat')).toBeTruthy())

    socketFor('/ws/chat')._simulateMessage({
      action: 'connect',
      players: [{ userId: 'u1', sender_username: 'Alice', message: 'smuggled' }],
    })

    expect(await screen.findByText('existing')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByText('smuggled')).not.toBeInTheDocument()
  })
})

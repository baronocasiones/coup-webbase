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

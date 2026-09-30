import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getChatMessages, addChatMessage } from '../../services/chat'

vi.mock('../../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import axios from '../../axios'

describe('chat service @unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getChatMessages', () => {
    it('fetches chat messages from GET /chats', async () => {
      const mockMessages = [
        { userId: '1', sender_username: 'Alice', message: 'Hello!' },
        { userId: null, sender_username: 'System', message: 'Game started' },
      ]
      axios.get.mockResolvedValue({ data: mockMessages })

      const result = await getChatMessages()

      expect(axios.get).toHaveBeenCalledWith('/chats')
      expect(result).toEqual(mockMessages)
    })

    it('propagates errors', async () => {
      axios.get.mockRejectedValue(new Error('Timeout'))

      await expect(getChatMessages()).rejects.toThrow('Timeout')
    })
  })

  describe('addChatMessage', () => {
    it('posts the message and lets the server do the broadcasting', async () => {
      const mockResponse = { id: 'msg-1', status: 'ok' }
      axios.post.mockResolvedValue({ data: mockResponse })

      // No socket is passed, and none is needed.
      const result = await addChatMessage({
        userId: '1',
        username: 'Alice',
        message: 'Hello!',
      })

      expect(axios.post).toHaveBeenCalledWith('/chat', {
        userId: '1',
        sender_username: 'Alice',
        message: 'Hello!',
      })
      expect(result).toEqual(mockResponse)
    })

    it('does not require a live socket to be heard', async () => {
      // The old contract made the sender's browser POST *and* send a frame, in
      // that order. A message written while that socket was down — reconnecting,
      // or never opened — was persisted and announced to nobody, and nothing
      // said so. The write is now the event, and the server pushes from it.
      axios.post.mockResolvedValue({ data: {} })
      const mockWs = { send: vi.fn(), readyState: WebSocket.CLOSED }

      await expect(
        addChatMessage({ userId: '1', username: 'Alice', message: 'Hello!' })
      ).resolves.toBeDefined()

      // Nothing is sent over a socket at all, closed or otherwise.
      expect(mockWs.send).not.toHaveBeenCalled()
    })
    })

    it('propagates POST errors', async () => {
      axios.post.mockRejectedValue(new Error('Forbidden'))
      const mockWs = { send: vi.fn() }

      await expect(addChatMessage({
        userId: '1',
        username: 'Alice',
        message: 'Hi',
        chatWs: mockWs,
      })).rejects.toThrow('Forbidden')
    })
  })

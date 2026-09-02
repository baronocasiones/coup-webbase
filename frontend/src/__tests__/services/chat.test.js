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
    it('posts message to POST /chat and broadcasts via WS', async () => {
      const mockResponse = { id: 'msg-1', status: 'ok' }
      axios.post.mockResolvedValue({ data: mockResponse })
      const mockWs = { send: vi.fn(), readyState: WebSocket.OPEN }

      const result = await addChatMessage({
        userId: '1',
        username: 'Alice',
        message: 'Hello!',
        chatWs: mockWs,
      })

      expect(axios.post).toHaveBeenCalledWith('/chat', {
        userId: '1',
        sender_username: 'Alice',
        message: 'Hello!',
      })
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        userId: '1',
        sender_username: 'Alice',
        message: 'Hello!',
      }))
      expect(result).toEqual(mockResponse)
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
})

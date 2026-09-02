import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPlayers, removePlayer, changeReadyState } from '../../services/player'

// Mock the axios instance
vi.mock('../../axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

import axios from '../../axios'

describe('player service @unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPlayers', () => {
    it('fetches players from GET /players', async () => {
      const mockPlayers = [
        { id: '1', name: 'Alice', isReady: true, coins: 2 },
        { id: '2', name: 'Bob', isReady: false, coins: 2 },
      ]
      axios.get.mockResolvedValue({ data: mockPlayers })

      const result = await getPlayers()

      expect(axios.get).toHaveBeenCalledWith('/players')
      expect(result).toEqual(mockPlayers)
    })

    it('propagates network errors', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'))

      await expect(getPlayers()).rejects.toThrow('Network Error')
    })
  })

  describe('removePlayer', () => {
    it('sends DELETE /player with user_id param and broadcasts disconnect via WS', async () => {
      const mockPlayers = [{ id: '2', name: 'Bob' }]
      axios.delete.mockResolvedValue({ data: mockPlayers })
      const mockWs = { send: vi.fn(), readyState: WebSocket.OPEN }

      await removePlayer({ playerId: '1', gameWs: mockWs })

      expect(axios.delete).toHaveBeenCalledWith('/player', { params: { user_id: '1' } })
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'disconnect',
        players: mockPlayers,
      }))
    })

    it('logs error on failure without throwing', async () => {
      axios.delete.mockRejectedValue(new Error('Server error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockWs = { send: vi.fn() }

      await removePlayer({ playerId: '1', gameWs: mockWs })

      expect(consoleSpy).toHaveBeenCalledWith('Error disconnecting player:', 'Server error')
      expect(mockWs.send).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('changeReadyState', () => {
    it('sends PATCH /player with correct params and broadcasts ready via WS', async () => {
      const mockPlayers = [{ id: '1', name: 'Alice', isReady: true }]
      axios.patch.mockResolvedValue({ data: mockPlayers })
      const mockWs = { send: vi.fn(), readyState: WebSocket.OPEN }

      await changeReadyState({ playerId: '1', gameWs: mockWs, newReadyState: true })

      expect(axios.patch).toHaveBeenCalledWith('/player', null, {
        params: { target_player_id: '1', new_ready_state: true },
      })
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'ready',
        players: mockPlayers,
      }))
    })

    it('logs error detail on failure', async () => {
      axios.patch.mockRejectedValue({ response: { data: { detail: 'Player not found' } } })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockWs = { send: vi.fn() }

      await changeReadyState({ playerId: '999', gameWs: mockWs, newReadyState: true })

      expect(consoleSpy).toHaveBeenCalledWith('Player not found')
      expect(mockWs.send).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})

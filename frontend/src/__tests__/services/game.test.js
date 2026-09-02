import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGame, getUserPlayer } from '../../services/game'

vi.mock('../../axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import axios from '../../axios'

describe('game service @unit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGame', () => {
    it('fetches game state from GET /game-state', async () => {
      const mockGame = {
        state: 'WAITING_FOR_ACTION',
        currentTurn: { id: '1', name: 'Alice' },
        playersState: [
          { id: '1', name: 'Alice', coins: 2, cards: ['DUKE', 'ASSASSIN'] },
        ],
        cardsInDeck: 10,
      }
      axios.get.mockResolvedValue({ data: mockGame })

      const result = await getGame()

      expect(axios.get).toHaveBeenCalledWith('/game-state')
      expect(result).toEqual(mockGame)
    })

    it('propagates errors (e.g. 404 when no game)', async () => {
      axios.get.mockRejectedValue(new Error('Request failed with status code 404'))

      await expect(getGame()).rejects.toThrow('404')
    })
  })

  describe('getUserPlayer', () => {
    it('fetches user player from GET /user-player with user_id param', async () => {
      const mockPlayer = {
        id: '1',
        name: 'Alice',
        coins: 5,
        cards: ['DUKE', 'CAPTAIN'],
        isReady: true,
      }
      axios.get.mockResolvedValue({ data: mockPlayer })

      const result = await getUserPlayer('1')

      expect(axios.get).toHaveBeenCalledWith('/user-player', { params: { user_id: '1' } })
      expect(result).toEqual(mockPlayer)
    })

    it('propagates errors', async () => {
      axios.get.mockRejectedValue(new Error('Not Found'))

      await expect(getUserPlayer('999')).rejects.toThrow('Not Found')
    })
  })
})

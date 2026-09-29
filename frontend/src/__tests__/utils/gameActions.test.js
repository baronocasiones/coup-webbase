import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  broadcastMove,
  broadcastBlock,
  broadcastChallenge,
  broadcastNoChallenge,
  broadcastExchangeSelection,
  broadcastInfluenceSelection,
  ACTION_REQUIRES,
  BLOCK_REQUIRES,
  BLOCKABLE_ACTIONS,
} from '../../utils/gameActions'

describe('gameActions utils @unit', () => {
  let mockWs

  beforeEach(() => {
    mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    }
  })

  describe('broadcastMove', () => {
    it('sends declare_move action with move and target', () => {
      broadcastMove(mockWs, 'ASSASSINATE', 'player-2')

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'declare_move',
        payload: { move: 'ASSASSINATE', target: 'player-2' },
      }))
    })

    it('sends declare_move with undefined target when not provided', () => {
      broadcastMove(mockWs, 'TAX')

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'declare_move',
        payload: { move: 'TAX', target: undefined },
      }))
    })
  })

  describe('broadcastBlock', () => {
    it('sends block action with block move', () => {
      broadcastBlock(mockWs, 'BLOCK FOREIGN AID')

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'block',
        payload: { move: 'BLOCK FOREIGN AID' },
      }))
    })
  })

  describe('broadcastChallenge', () => {
    it('sends challenge action with challengerId', () => {
      broadcastChallenge(mockWs, 'player-1')

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'challenge',
        payload: { challengerId: 'player-1' },
      }))
    })
  })

  describe('broadcastNoChallenge', () => {
    it('sends no_challenge action with empty payload', () => {
      broadcastNoChallenge(mockWs)

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'no_challenge',
        payload: {},
      }))
    })
  })

  describe('broadcastExchangeSelection', () => {
    it('sends exchange_selection with selected cards', () => {
      broadcastExchangeSelection(mockWs, ['DUKE', 'ASSASSIN'])

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'exchange_selection',
        payload: { cards: ['DUKE', 'ASSASSIN'] },
      }))
    })
  })

  describe('broadcastInfluenceSelection', () => {
    it('sends influence_selection with card', () => {
      broadcastInfluenceSelection(mockWs, 'DUKE')

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'influence_selection',
        payload: { card: 'DUKE' },
      }))
    })
  })

  describe('send helper (edge cases)', () => {
    it('does not send when ws is null', () => {
      broadcastMove(null, 'TAX')
      // Should not throw
    })

    it('does not send when ws is not open', () => {
      mockWs.readyState = WebSocket.CLOSED
      broadcastMove(mockWs, 'TAX')
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('does not send when ws is connecting', () => {
      mockWs.readyState = WebSocket.CONNECTING
      broadcastMove(mockWs, 'TAX')
      expect(mockWs.send).not.toHaveBeenCalled()
    })
  })

  describe('ACTION_REQUIRES constants', () => {
    it('maps TAX to DUKE', () => {
      expect(ACTION_REQUIRES.TAX).toBe('DUKE')
    })

    it('maps ASSASSINATE to ASSASSIN', () => {
      expect(ACTION_REQUIRES.ASSASSINATE).toBe('ASSASSIN')
    })

    it('maps STEAL to CAPTAIN', () => {
      expect(ACTION_REQUIRES.STEAL).toBe('CAPTAIN')
    })

    it('maps EXCHANGE to AMBASSADOR', () => {
      expect(ACTION_REQUIRES.EXCHANGE).toBe('AMBASSADOR')
    })
  })

  describe('BLOCK_REQUIRES constants', () => {
    // Values are lists, not scalars: a block can be backed by more than one
    // influence, and BLOCK STEAL by two.

    it('maps BLOCK FOREIGN AID to DUKE', () => {
      expect(BLOCK_REQUIRES['BLOCK FOREIGN AID']).toEqual(['DUKE'])
    })

    it('maps BLOCK ASSASSINATION to CONTESSA', () => {
      expect(BLOCK_REQUIRES['BLOCK ASSASSINATION']).toEqual(['CONTESSA'])
    })

    it('maps BLOCK STEAL to both CAPTAIN and AMBASSADOR', () => {
      // Influence.AMBASSADOR grants BlockMove.BLOCK_STEAL as well as CAPTAIN
      // (backend/services/Influence.py). This was previously `'CAPTAIN'`,
      // which reported an Ambassador's block as unbackable.
      expect(BLOCK_REQUIRES['BLOCK STEAL']).toEqual(['CAPTAIN', 'AMBASSADOR'])
    })

    it('never maps a block move to a bare string', () => {
      // A scalar would silently pass `.includes` checks in the wrong direction
      // and break every consumer that iterates the backing influences.
      for (const [blockMove, backable] of Object.entries(BLOCK_REQUIRES)) {
        expect(Array.isArray(backable), `${blockMove} must map to a list`).toBe(true)
        expect(backable.length).toBeGreaterThan(0)
      }
    })
  })

  describe('BLOCKABLE_ACTIONS constants', () => {
    it('maps FOREIGN AID to BLOCK FOREIGN AID', () => {
      expect(BLOCKABLE_ACTIONS['FOREIGN AID']).toEqual(['BLOCK FOREIGN AID'])
    })

    it('maps ASSASSINATE to BLOCK ASSASSINATION', () => {
      expect(BLOCKABLE_ACTIONS.ASSASSINATE).toEqual(['BLOCK ASSASSINATION'])
    })

    it('maps STEAL to BLOCK STEAL', () => {
      expect(BLOCKABLE_ACTIONS.STEAL).toEqual(['BLOCK STEAL'])
    })

    it('does not map INCOME (not blockable)', () => {
      expect(BLOCKABLE_ACTIONS['INCOME']).toBeUndefined()
    })

    it('does not map COUP (not blockable)', () => {
      expect(BLOCKABLE_ACTIONS['COUP']).toBeUndefined()
    })
  })
})

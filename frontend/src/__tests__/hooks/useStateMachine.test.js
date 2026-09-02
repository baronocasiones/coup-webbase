import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStateMachine, gameStates } from '../../hooks/useStateMachine'

describe('useStateMachine hook @unit', () => {
  describe('gameStates constants', () => {
    it('exports all expected game states', () => {
      expect(gameStates.perform_action).toBe('PERFORM_ACTION')
      expect(gameStates.move_declared).toBe('MOVE_DECLARED')
      expect(gameStates.choose_cards).toBe('CHOOSE_CARDS')
      expect(gameStates.choosing_target).toBe('CHOOSING_TARGET')
      expect(gameStates.waiting_for_moves).toBe('WAITING_FOR_MOVES')
      expect(gameStates.challenge).toBe('CHALLENGE')
    })
  })

  describe('initial state', () => {
    it('returns the initial state', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.waiting_for_moves })
      )

      expect(result.current[0].gameState).toBe(gameStates.waiting_for_moves)
    })
  })

  describe('transitions from WAITING_FOR_MOVES', () => {
    it('transitions to MOVE_DECLARED on move_declared action', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.waiting_for_moves })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: { move: 'TAX' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.move_declared,
        payload: { move: 'TAX' },
      })
    })

    it('transitions to CHOOSING_TARGET on choosing_target action', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.waiting_for_moves })
      )

      act(() => {
        result.current[1]({ type: gameStates.choosing_target, payload: { move: 'STEAL' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.choosing_target,
        payload: { move: 'STEAL' },
      })
    })

    it('stays in WAITING_FOR_MOVES on unknown action', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.waiting_for_moves })
      )

      act(() => {
        result.current[1]({ type: 'UNKNOWN', payload: {} })
      })

      expect(result.current[0].gameState).toBe(gameStates.waiting_for_moves)
    })
  })

  describe('transitions from MOVE_DECLARED', () => {
    it('transitions to CHALLENGE on challenge action', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.move_declared, payload: { move: 'TAX' } })
      )

      act(() => {
        result.current[1]({ type: gameStates.challenge, payload: { challengerId: 'p1' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.challenge,
        payload: { challengerId: 'p1' },
      })
    })

    it('transitions to CHOOSING_TARGET for targeted moves (COUP)', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.move_declared, payload: { move: 'COUP' } })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: { move: 'COUP' } })
      })

      expect(result.current[0].gameState).toBe(gameStates.choosing_target)
    })

    it('transitions to CHOOSING_TARGET for ASSASSINATE', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.move_declared, payload: { move: 'ASSASSINATE' } })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: { move: 'ASSASSINATE' } })
      })

      expect(result.current[0].gameState).toBe(gameStates.choosing_target)
    })

    it('transitions to CHOOSE_CARDS for EXCHANGE', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.move_declared, payload: { move: 'EXCHANGE' } })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: { move: 'EXCHANGE' } })
      })

      expect(result.current[0].gameState).toBe(gameStates.choose_cards)
    })

    it('stays in MOVE_DECLARED for non-targeted non-exchange moves', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.move_declared, payload: { move: 'TAX' } })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: { move: 'TAX' } })
      })

      expect(result.current[0].gameState).toBe(gameStates.move_declared)
    })
  })

  describe('transitions from CHOOSING_TARGET', () => {
    it('transitions to MOVE_DECLARED when target is selected', () => {
      const { result } = renderHook(() =>
        useStateMachine({
          gameState: gameStates.choosing_target,
          payload: { move: 'STEAL' },
        })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: { target: 'p2' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.move_declared,
        payload: { target: 'p2', move: 'STEAL' },
      })
    })

    it('stays in CHOOSING_TARGET when no target provided', () => {
      const { result } = renderHook(() =>
        useStateMachine({
          gameState: gameStates.choosing_target,
          payload: { move: 'STEAL' },
        })
      )

      act(() => {
        result.current[1]({ type: gameStates.move_declared, payload: {} })
      })

      expect(result.current[0].gameState).toBe(gameStates.choosing_target)
    })
  })

  describe('transitions from CHOOSE_CARDS', () => {
    it('transitions to PERFORM_ACTION when card is chosen', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.choose_cards, payload: {} })
      )

      act(() => {
        result.current[1]({ type: gameStates.choose_cards, payload: { chosenCard: 'DUKE' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.perform_action,
        payload: { chosenCard: 'DUKE' },
      })
    })

    it('stays in CHOOSE_CARDS when no card chosen', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.choose_cards, payload: {} })
      )

      act(() => {
        result.current[1]({ type: gameStates.choose_cards, payload: {} })
      })

      expect(result.current[0].gameState).toBe(gameStates.choose_cards)
    })
  })

  describe('transitions from PERFORM_ACTION', () => {
    it('transitions to WAITING_FOR_MOVES on SUCCESS', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.perform_action, payload: {} })
      )

      act(() => {
        result.current[1]({ type: gameStates.perform_action, payload: { status: 'SUCCESS' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.waiting_for_moves,
        payload: { status: 'SUCCESS' },
      })
    })

    it('stays in PERFORM_ACTION on non-SUCCESS', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.perform_action, payload: {} })
      )

      act(() => {
        result.current[1]({ type: gameStates.perform_action, payload: { status: 'FAILED' } })
      })

      expect(result.current[0].gameState).toBe(gameStates.perform_action)
    })
  })

  describe('transitions from CHALLENGE', () => {
    it('transitions to PERFORM_ACTION on WIN', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.challenge, payload: {} })
      )

      act(() => {
        result.current[1]({ type: gameStates.challenge, payload: { challengeResult: 'WIN' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.perform_action,
        payload: { challengeResult: 'WIN' },
      })
    })

    it('transitions to CHOOSE_CARDS on LOSE', () => {
      const { result } = renderHook(() =>
        useStateMachine({ gameState: gameStates.challenge, payload: {} })
      )

      act(() => {
        result.current[1]({ type: gameStates.challenge, payload: { challengeResult: 'LOSE' } })
      })

      expect(result.current[0]).toEqual({
        gameState: gameStates.choose_cards,
        payload: { challengeResult: 'LOSE' },
      })
    })
  })
})

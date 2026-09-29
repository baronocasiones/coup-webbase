import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCountUp } from '../../hooks/useCountUp'

const originalMatchMedia = window.matchMedia

function mockReducedMotion(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('useCountUp @unit', () => {
  beforeEach(() => {
    mockReducedMotion(false)
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('shows the first known value immediately, without counting up from zero', () => {
    // A starting hand should not animate in from nothing.
    const { result } = renderHook(() => useCountUp(4))

    expect(result.current).toBe(4)
  })

  it('holds at zero while the value is still undefined', () => {
    const { result } = renderHook(() => useCountUp(undefined))

    expect(result.current).toBe(0)
  })

  it('snaps to the real value once it arrives, rather than tweening from zero', () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), {
      initialProps: { v: undefined },
    })

    expect(result.current).toBe(0)

    rerender({ v: 7 })

    expect(result.current).toBe(7)
  })

  it('lands exactly on the target when tweening', async () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), {
      initialProps: { v: 2 },
    })

    rerender({ v: 9 })

    await waitFor(() => {
      expect(result.current).toBe(9)
    })
  })

  it('never reports a fractional coin', async () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), {
      initialProps: { v: 0 },
    })

    const seen = []
    rerender({ v: 5 })
    // Sample the value across the tween window.
    for (let i = 0; i < 12; i++) {
      seen.push(result.current)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40))
      })
    }

    seen.forEach((value) => expect(Number.isInteger(value)).toBe(true))
    await waitFor(() => expect(result.current).toBe(5))
  })

  it('snaps instead of tweening when reduced motion is requested', () => {
    mockReducedMotion(true)
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), {
      initialProps: { v: 1 },
    })

    rerender({ v: 8 })

    expect(result.current).toBe(8)
  })

  it('returns to zero when the value becomes unavailable', () => {
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), {
      initialProps: { v: 3 },
    })

    rerender({ v: undefined })

    expect(result.current).toBe(0)
  })
})

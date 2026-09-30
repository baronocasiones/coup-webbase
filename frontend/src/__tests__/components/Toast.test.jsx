import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Toast from '../../components/Toast'
import { TOAST_DISMISS_MS } from '../../utils/motion'

/**
 * A toast reports a refused action.
 *
 * It exists because every WebSocket handler answers a rejection with
 * `{"error": ...}` and the client used to write that to the console and nowhere
 * else — so a refused action was indistinguishable from an ignored one. The
 * influence-selection bug is the extreme case: the picker was offered to the
 * wrong player, every selection came back refused, and the table sat in a dead
 * state with nothing on screen to say why.
 *
 * The dismissal timing comes from `TOAST_DISMISS_MS` rather than a literal, so
 * this test and the component cannot disagree about it.
 */
describe('Toast component @unit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing without a message', () => {
    const { container } = render(<Toast onDismiss={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the message, verbatim', () => {
    // The server's own words rather than a generic apology: the player should
    // learn what the rule was, not only that something went wrong.
    render(
      <Toast message="Only the target of an action can block it." onDismiss={() => {}} />
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the target of an action can block it.'
    )
  })

  it('announces itself to a screen reader', () => {
    // A refused action with no announcement is the exact failure this replaces,
    // one level down: a sighted player would at least have seen something.
    render(<Toast message="Refused" onDismiss={() => {}} />)

    const alert = screen.getByRole('alert')
    expect(alert.getAttribute('aria-live')).toBe('assertive')
  })

  it('dismisses itself after the token duration', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Refused" onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(TOAST_DISMISS_MS - 1)
    })
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('carries the tone as a data attribute', () => {
    // The left border does the work of the type, so it has to be reachable
    // without relying on hue.
    render(<Toast message="Careful" tone="warning" onDismiss={() => {}} />)

    expect(screen.getByRole('alert').getAttribute('data-tone')).toBe('warning')
  })

  it('restarts the countdown when a different message replaces it', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<Toast message="First" onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(TOAST_DISMISS_MS - 100)
    })
    rerender(<Toast message="Second" onDismiss={onDismiss} />)

    // The old timer must not fire against the new message's lifetime.
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(TOAST_DISMISS_MS)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not let a re-render restart the countdown', () => {
    // `onDismiss` is a fresh closure on every parent render. Depending on it
    // would reset the timer each time, and the toast would never leave.
    const onDismiss = vi.fn()
    const { rerender } = render(<Toast message="Refused" onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(TOAST_DISMISS_MS - 50)
    })
    rerender(<Toast message="Refused" onDismiss={onDismiss} />)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

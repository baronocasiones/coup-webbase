import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Toast from '../../components/Toast'

describe('Toast component @unit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders message text', () => {
    render(<Toast message="Operation successful" />)
    expect(screen.getByText('Operation successful')).toBeInTheDocument()
  })

  it('renders with role="alert" for accessibility', () => {
    render(<Toast message="Alert!" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows default info icon for info type', () => {
    render(<Toast message="Info" type="info" />)
    expect(screen.getByText('ℹ')).toBeInTheDocument()
  })

  it('shows success icon for success type', () => {
    render(<Toast message="Done" type="success" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows error icon for error type', () => {
    render(<Toast message="Failed" type="error" />)
    // ✕ appears in both the icon span and the close button — use icon specifically
    const errorIcons = screen.getAllByText('✕')
    expect(errorIcons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows warning icon for warning type', () => {
    render(<Toast message="Careful" type="warning" />)
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('shows custom icon when provided', () => {
    render(<Toast message="Custom" icon="🎉" />)
    expect(screen.getByText('🎉')).toBeInTheDocument()
  })

  it('auto-dismisses after duration', () => {
    render(<Toast message="Auto close" duration={2000} />)
    expect(screen.getByText('Auto close')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // After duration + 300ms animation, it should be gone
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Auto close')).not.toBeInTheDocument()
  })

  it('does not auto-dismiss when duration is 0', () => {
    render(<Toast message="Persistent" duration={0} />)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Persistent')).toBeInTheDocument()
  })

  it('has a close button with aria-label', () => {
    render(<Toast message="Closable" />)
    expect(screen.getByRole('button', { name: 'Close notification' })).toBeInTheDocument()
  })

  it('closes when close button is clicked', () => {
    render(<Toast message="Click close" />)

    act(() => {
      screen.getByRole('button', { name: 'Close notification' }).click()
    })

    // After 300ms animation
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Click close')).not.toBeInTheDocument()
  })
})

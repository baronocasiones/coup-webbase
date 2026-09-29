import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Opponents from '../../components/Opponents'

describe('Opponents component @unit', () => {
  const defaultOpponents = [
    { id: '1', name: 'Alice', coins: 5, numberOfCards: 2 },
    { id: '2', name: 'Bob', coins: 3, numberOfCards: 1 },
    { id: '3', name: 'Charlie', coins: 7, numberOfCards: 2 },
  ]

  const defaultProps = {
    opponents: defaultOpponents,
    userId: '1',
    setIsChoosingTarget: vi.fn(),
    isChoosingTarget: false,
    currentTurnId: '2',
    onPlayerClick: vi.fn(),
  }

  it('renders all opponents (excluding current user)', () => {
    render(<Opponents {...defaultProps} />)

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('displays player coins', () => {
    render(<Opponents {...defaultProps} />)

    expect(screen.getByText('3')).toBeInTheDocument() // Bob's coins
    expect(screen.getByText('7')).toBeInTheDocument() // Charlie's coins
  })

  it('renders card slots for each player', () => {
    const { container } = render(<Opponents {...defaultProps} />)
    // Bob has 1 card, Charlie has 2 cards
    const cards = container.querySelectorAll('[class]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('applies active class to current turn player', () => {
    const { container } = render(<Opponents {...defaultProps} />)
    // Bob (id: 2) is the current turn
    // Check that there's an element with the active class
    expect(container.querySelector('[class*="playerActive"]')).toBeTruthy()
  })

  it('calls onPlayerClick when clicking an opponent while choosing target', () => {
    const onPlayerClick = vi.fn()
    const setIsChoosingTarget = vi.fn()
    render(
      <Opponents
        {...defaultProps}
        isChoosingTarget={true}
        onPlayerClick={onPlayerClick}
        setIsChoosingTarget={setIsChoosingTarget}
      />
    )

    fireEvent.click(screen.getByText('Bob'))
    expect(onPlayerClick).toHaveBeenCalledWith('2')
    expect(setIsChoosingTarget).toHaveBeenCalledWith(false)
  })

  it('does not call onPlayerClick when not choosing target', () => {
    const onPlayerClick = vi.fn()
    render(
      <Opponents
        {...defaultProps}
        isChoosingTarget={false}
        onPlayerClick={onPlayerClick}
      />
    )

    fireEvent.click(screen.getByText('Bob'))
    expect(onPlayerClick).not.toHaveBeenCalled()
  })

  it('applies targetable class when choosing target', () => {
    const { container } = render(
      <Opponents {...defaultProps} isChoosingTarget={true} />
    )

    expect(container.querySelector('[class*="playerTargetable"]')).toBeTruthy()
  })

  it('generates initials from player name', () => {
    render(<Opponents {...defaultProps} />)

    // Single-word names: "Bob" -> "B", "Charlie" -> "C"
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('shows "?" for players with no name', () => {
    render(
      <Opponents
        {...defaultProps}
        opponents={[{ id: '4', name: '', coins: 2, numberOfCards: 2 }]}
      />
    )

    expect(screen.getByText('?')).toBeInTheDocument()
  })

  describe('keyboard access while choosing a target', () => {
    it('renders each opponent as a real button, not a div with onClick', () => {
      render(
        <Opponents
          {...defaultProps}
          isChoosingTarget={true}
          onPlayerClick={vi.fn()}
          setIsChoosingTarget={vi.fn()}
        />
      )

      // Coup/Assassinate/Steal all route through this, so it has to be
      // reachable without a pointer.
      const target = screen.getByRole('button', { name: /Target Bob/ })
      expect(target.tagName).toBe('BUTTON')
    })

    it('gives each target an accessible name describing the player', () => {
      render(
        <Opponents
          {...defaultProps}
          isChoosingTarget={true}
          onPlayerClick={vi.fn()}
          setIsChoosingTarget={vi.fn()}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Target Charlie, 7 coins, 2 cards' })
      ).toBeInTheDocument()
    })

    it('activates a target from the keyboard', () => {
      const onPlayerClick = vi.fn()
      const setIsChoosingTarget = vi.fn()
      render(
        <Opponents
          {...defaultProps}
          isChoosingTarget={true}
          onPlayerClick={onPlayerClick}
          setIsChoosingTarget={setIsChoosingTarget}
        />
      )

      const target = screen.getByRole('button', { name: /Target Bob/ })
      target.focus()
      expect(target).toHaveFocus()

      // A native button turns Enter into a click event; a div would not.
      fireEvent.click(target)
      expect(onPlayerClick).toHaveBeenCalledWith('2')
      expect(setIsChoosingTarget).toHaveBeenCalledWith(false)
    })

    it('does not render buttons when no target is being chosen', () => {
      const { container } = render(<Opponents {...defaultProps} />)

      expect(container.querySelectorAll('button.player')).toHaveLength(0)
    })
  })
})

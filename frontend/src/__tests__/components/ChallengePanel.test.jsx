import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChallengePanel from '../../components/ChallengePanel'

describe('ChallengePanel component @unit', () => {
  const defaultProps = {
    gameState: {
      state: 'ACTION_DECLARED',
      declaredMove: 'TAX',
      currentTurn: { id: '2', name: 'Bob' },
    },
    userId: '1',
    onChallenge: vi.fn(),
    onNoChallenge: vi.fn(),
    onBlock: vi.fn(),
  }

  it('returns null when gameState is null', () => {
    const { container } = render(<ChallengePanel {...defaultProps} gameState={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when it is the user own turn', () => {
    const { container } = render(
      <ChallengePanel {...defaultProps} userId="2" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows challenge and pass buttons for challengeable actions', () => {
    render(<ChallengePanel {...defaultProps} />)

    expect(screen.getByText('Challenge')).toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })

  it('displays the declared move name', () => {
    render(<ChallengePanel {...defaultProps} />)

    expect(screen.getByText(/Respond to TAX/)).toBeInTheDocument()
  })

  it('calls onChallenge when Challenge button is clicked', () => {
    const onChallenge = vi.fn()
    render(<ChallengePanel {...defaultProps} onChallenge={onChallenge} />)

    fireEvent.click(screen.getByText('Challenge'))
    expect(onChallenge).toHaveBeenCalledTimes(1)
  })

  it('calls onNoChallenge when Pass button is clicked', () => {
    const onNoChallenge = vi.fn()
    render(<ChallengePanel {...defaultProps} onNoChallenge={onNoChallenge} />)

    fireEvent.click(screen.getByText('Pass'))
    expect(onNoChallenge).toHaveBeenCalledTimes(1)
  })

  it('shows Block button for blockable actions (FOREIGN AID)', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'FOREIGN AID',
        }}
      />
    )

    // FOREIGN AID is blockable but not challengeable, so only Block + Pass
    expect(screen.getByText(/Block/)).toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })

  it('calls onBlock with correct block move', () => {
    const onBlock = vi.fn()
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'FOREIGN AID',
        }}
        onBlock={onBlock}
      />
    )

    fireEvent.click(screen.getByText(/Block/))
    expect(onBlock).toHaveBeenCalledWith('BLOCK FOREIGN AID')
  })

  it('shows Block button alongside Challenge for STEAL (blockable + challengeable)', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'STEAL',
        }}
      />
    )

    expect(screen.getByText(/Block \(BLOCK STEAL\)/)).toBeInTheDocument()
    expect(screen.getByText('Challenge')).toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })

  it('shows challenge buttons for BLOCK_DECLARED state', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          state: 'BLOCK_DECLARED',
          currentTurn: { id: '2', name: 'Bob' },
        }}
      />
    )

    expect(screen.getByText('Challenge Block')).toBeInTheDocument()
    expect(screen.getByText('Accept Block')).toBeInTheDocument()
  })

  it('calls onChallenge for block challenge', () => {
    const onChallenge = vi.fn()
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          state: 'BLOCK_DECLARED',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        onChallenge={onChallenge}
      />
    )

    fireEvent.click(screen.getByText('Challenge Block'))
    expect(onChallenge).toHaveBeenCalledTimes(1)
  })

  it('calls onNoChallenge for accept block', () => {
    const onNoChallenge = vi.fn()
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          state: 'BLOCK_DECLARED',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        onNoChallenge={onNoChallenge}
      />
    )

    fireEvent.click(screen.getByText('Accept Block'))
    expect(onNoChallenge).toHaveBeenCalledTimes(1)
  })

  it('returns null for non-declared states', () => {
    const { container } = render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          state: 'WAITING_FOR_ACTION',
          currentTurn: { id: '2', name: 'Bob' },
        }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('does not show Challenge button for INCOME (not challengeable)', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'INCOME',
        }}
      />
    )

    expect(screen.queryByText('Challenge')).not.toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })
})

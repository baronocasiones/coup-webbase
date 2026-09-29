import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChallengePanel from '../../components/ChallengePanel'

/**
 * `visible` is supplied by PlayRoom, which is now the only place that decides
 * who may respond to a declared move — the rule inverts between
 * ACTION_DECLARED and BLOCK_DECLARED, which a single in-component `isMyTurn`
 * check cannot express. These tests therefore drive the panel as the caller
 * does. The caller-side gate is covered in PlayRoom.test.jsx.
 */
describe('ChallengePanel component @unit', () => {
  const defaultProps = {
    visible: true,
    gameState: {
      state: 'ACTION_DECLARED',
      declaredMove: 'TAX',
      currentTurn: { id: '2', name: 'Bob' },
    },
    userId: '1',
    cards: ['ASSASSIN'],
    onChallenge: vi.fn(),
    onNoChallenge: vi.fn(),
    onBlock: vi.fn(),
  }

  it('returns null when gameState is null', () => {
    const { container } = render(<ChallengePanel {...defaultProps} gameState={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when the caller marks it not visible', () => {
    const { container } = render(<ChallengePanel {...defaultProps} visible={false} />)
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

    // FOREIGN AID is blockable but not challengeable, so Block + Pass
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

  it('offers Challenge, Block and Pass together for STEAL', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'STEAL',
        }}
      />
    )

    // STEAL is blockable *and* challengeable. The old four-way branch rendered
    // Block alone for this case, so a table facing a Steal was offered no way
    // to challenge it and no way to pass it — only to block it. All three
    // options are independent and all three must be present.
    expect(screen.getByText('Block (BLOCK STEAL)')).toBeInTheDocument()
    expect(screen.getByText('Challenge')).toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })

  it('offers Challenge, Block and Pass together for ASSASSINATE', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'ASSASSINATE',
        }}
      />
    )

    expect(screen.getByText('Block (BLOCK ASSASSINATION)')).toBeInTheDocument()
    expect(screen.getByText('Challenge')).toBeInTheDocument()
    expect(screen.getByText('Pass')).toBeInTheDocument()
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

  // --- Bluffing is labelled, never prevented -------------------------------
  //
  // A block the player cannot back is still offered, because declaring one is
  // how you bluff and the challenge system is what punishes it. Hiding the
  // button would remove the bluff from the game, and would contradict the rule
  // the action buttons already follow.

  it('keeps Block available and flags it as a bluff when the player holds no Duke', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        cards={['ASSASSIN']}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'FOREIGN AID',
        }}
      />
    )

    const blockBtn = screen.getByText(/Block/).closest('button')
    expect(blockBtn).not.toBeDisabled()
    // `getAttribute` + `toMatch`, not `toHaveAttribute(name, /regex/)`. The
    // latter reports a mismatch on a regex that plainly matches the value in
    // this repo's jest-dom (7.0.1) — reproducible with a hand-built element
    // and no component in the picture. Asserting through the plain string
    // matcher does not depend on that behaviour.
    expect(blockBtn.getAttribute('title')).toMatch(/this is a bluff/)
    expect(blockBtn.getAttribute('title')).toContain('DUKE')
  })

  it('does not flag a block as a bluff when the player holds a Duke', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        cards={['DUKE', 'ASSASSIN']}
        gameState={{
          ...defaultProps.gameState,
          declaredMove: 'FOREIGN AID',
        }}
      />
    )

    const blockBtn = screen.getByText(/Block/).closest('button')
    expect(blockBtn).not.toBeDisabled()
    expect(blockBtn.getAttribute('title') ?? '').not.toMatch(/this is a bluff/)
  })

  it('accepts either a Captain or an Ambassador as backing BLOCK STEAL', () => {
    // Influence.AMBASSADOR grants BLOCK STEAL as well as CAPTAIN. A scalar
    // mapping reported an Ambassador's block as unbackable.
    const { rerender } = render(
      <ChallengePanel
        {...defaultProps}
        cards={['AMBASSADOR']}
        gameState={{ ...defaultProps.gameState, declaredMove: 'STEAL' }}
      />
    )
    expect(screen.getByText(/Block/).closest('button').getAttribute('title') ?? '').not.toMatch(
      /this is a bluff/
    )

    rerender(
      <ChallengePanel
        {...defaultProps}
        cards={['CAPTAIN']}
        gameState={{ ...defaultProps.gameState, declaredMove: 'STEAL' }}
      />
    )
    expect(screen.getByText(/Block/).closest('button').getAttribute('title') ?? '').not.toMatch(
      /this is a bluff/
    )
  })

  // --- Blocked actions -----------------------------------------------------

  it('shows the challenge options during BLOCK_DECLARED and names the blocker', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          state: 'BLOCK_DECLARED',
          declaredBlock: 'BLOCK FOREIGN AID',
          currentTurn: { id: '1', name: 'Alice' },
          blockerId: '2',
          playersState: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        }}
      />
    )

    expect(screen.getByText('Challenge Block')).toBeInTheDocument()
    expect(screen.getByText('Accept Block')).toBeInTheDocument()
    expect(screen.getByText(/Bob blocked with foreign aid/)).toBeInTheDocument()
  })

  it('refuses to render for the blocker during BLOCK_DECLARED', () => {
    // The blocker must never be able to answer their own block. This is a
    // structural guard on top of the caller's gate: a player who bluffs a block
    // could otherwise "Accept" it themselves and keep the coins.
    const { container } = render(
      <ChallengePanel
        {...defaultProps}
        userId="2"
        gameState={{
          state: 'BLOCK_DECLARED',
          declaredBlock: 'BLOCK FOREIGN AID',
          currentTurn: { id: '1', name: 'Alice' },
          blockerId: '2',
          playersState: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders for the blocked player, who is not the blocker', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        userId="1"
        gameState={{
          state: 'BLOCK_DECLARED',
          declaredBlock: 'BLOCK FOREIGN AID',
          currentTurn: { id: '1', name: 'Alice' },
          blockerId: '2',
          playersState: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        }}
      />
    )

    expect(screen.getByText('Challenge Block')).toBeInTheDocument()
  })

  it('degrades to a generic block description when the blocker is unknown', () => {
    render(
      <ChallengePanel
        {...defaultProps}
        gameState={{
          state: 'BLOCK_DECLARED',
          declaredBlock: 'BLOCK STEAL',
          currentTurn: { id: '1', name: 'Alice' },
          blockerId: '99',
          playersState: [],
        }}
      />
    )

    expect(screen.getByText(/Blocked with steal/)).toBeInTheDocument()
  })
})

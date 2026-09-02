import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GameStatus from '../../components/GameStatus'

describe('GameStatus component @unit', () => {
  it('returns null when gameState is null', () => {
    const { container } = render(<GameStatus gameState={null} userId="1" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows "your turn" message when it is the user turn in WAITING_FOR_ACTION', () => {
    render(
      <GameStatus
        gameState={{
          state: 'WAITING_FOR_ACTION',
          currentTurn: { id: '1', name: 'Alice' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText("It's your turn — choose an action")).toBeInTheDocument()
  })

  it('shows waiting message for other players turn', () => {
    render(
      <GameStatus
        gameState={{
          state: 'WAITING_FOR_ACTION',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Waiting for Bob...')).toBeInTheDocument()
  })

  it('shows action declared message', () => {
    render(
      <GameStatus
        gameState={{
          state: 'ACTION_DECLARED',
          declaredMove: 'TAX',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Bob declared tax')).toBeInTheDocument()
  })

  it('shows block declared message', () => {
    render(
      <GameStatus
        gameState={{
          state: 'BLOCK_DECLARED',
          declaredBlock: 'BLOCK FOREIGN AID',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Block declared: block foreign aid')).toBeInTheDocument()
  })

  it('shows challenge in progress message', () => {
    render(
      <GameStatus
        gameState={{
          state: 'CHALLENGE_HANDLE',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Challenge in progress...')).toBeInTheDocument()
  })

  it('shows exchange message for current player', () => {
    render(
      <GameStatus
        gameState={{
          state: 'PENDING_EXCHANGE',
          currentTurn: { id: '1', name: 'Alice' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Choose cards to keep')).toBeInTheDocument()
  })

  it('shows exchange message for other players', () => {
    render(
      <GameStatus
        gameState={{
          state: 'PENDING_EXCHANGE',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Bob is exchanging cards...')).toBeInTheDocument()
  })

  it('shows influence selection message for current player', () => {
    render(
      <GameStatus
        gameState={{
          state: 'INFLUENCE_SELECTION_PENDING',
          currentTurn: { id: '1', name: 'Alice' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Choose a card to lose')).toBeInTheDocument()
  })

  it('shows game over message', () => {
    render(
      <GameStatus
        gameState={{
          state: 'GAME_OVER',
          currentTurn: { id: '1', name: 'Alice' },
        }}
        userId="1"
      />
    )

    // "Game Over" appears as both badge and message — use getAllByText
    const gameOverElements = screen.getAllByText('Game Over')
    expect(gameOverElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows challenge loser info when present', () => {
    render(
      <GameStatus
        gameState={{
          state: 'CHALLENGE_HANDLE',
          currentTurn: { id: '2', name: 'Bob' },
          challengeLoser: { name: 'Charlie' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Charlie lost the challenge')).toBeInTheDocument()
  })

  it('displays badge labels for different states', () => {
    const { rerender } = render(
      <GameStatus
        gameState={{ state: 'ACTION_DECLARED', declaredMove: 'TAX', currentTurn: { id: '2' } }}
        userId="1"
      />
    )
    expect(screen.getByText('Action')).toBeInTheDocument()

    rerender(
      <GameStatus
        gameState={{ state: 'BLOCK_DECLARED', currentTurn: { id: '2' } }}
        userId="1"
      />
    )
    expect(screen.getByText('Block')).toBeInTheDocument()

    rerender(
      <GameStatus
        gameState={{ state: 'CHALLENGE_HANDLE', currentTurn: { id: '2' } }}
        userId="1"
      />
    )
    expect(screen.getByText('Challenge')).toBeInTheDocument()
  })

  it('shows generic action declared when no declaredMove', () => {
    render(
      <GameStatus
        gameState={{
          state: 'ACTION_DECLARED',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Action declared')).toBeInTheDocument()
  })

  it('shows generic block declared when no declaredBlock', () => {
    render(
      <GameStatus
        gameState={{
          state: 'BLOCK_DECLARED',
          currentTurn: { id: '2', name: 'Bob' },
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Block declared')).toBeInTheDocument()
  })
})

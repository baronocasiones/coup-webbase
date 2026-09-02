import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GameOver from '../../components/GameOver'

describe('GameOver component @unit', () => {
  it('returns null when gameState is null', () => {
    const { container } = render(<GameOver gameState={null} userId="1" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when state is not GAME_OVER', () => {
    const { container } = render(
      <GameOver gameState={{ state: 'WAITING_FOR_ACTION', playersState: [] }} userId="1" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders game over overlay when state is GAME_OVER', () => {
    render(
      <GameOver
        gameState={{
          state: 'GAME_OVER',
          playersState: [
            { id: '2', name: 'Bob' },
            { id: '1', name: 'Alice' },
          ],
        }}
        userId="1"
      />
    )

    expect(screen.getByText('Game Over')).toBeInTheDocument()
    expect(screen.getByText('Bob wins the game!')).toBeInTheDocument()
  })

  it('shows "You Won!" when current user is the winner', () => {
    render(
      <GameOver
        gameState={{
          state: 'GAME_OVER',
          playersState: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        }}
        userId="1"
      />
    )

    expect(screen.getByText('You Won!')).toBeInTheDocument()
    expect(screen.getByText('Congratulations!')).toBeInTheDocument()
  })

  it('displays player rankings', () => {
    render(
      <GameOver
        gameState={{
          state: 'GAME_OVER',
          playersState: [
            { id: '2', name: 'Bob' },
            { id: '3', name: 'Charlie' },
            { id: '1', name: 'Alice' },
          ],
        }}
        userId="1"
      />
    )

    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows "You" badge for the current user', () => {
    render(
      <GameOver
        gameState={{
          state: 'GAME_OVER',
          playersState: [
            { id: '2', name: 'Bob' },
            { id: '1', name: 'Alice' },
          ],
        }}
        userId="1"
      />
    )

    expect(screen.getAllByText('You').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Back to Lobby button', () => {
    render(
      <GameOver
        gameState={{
          state: 'GAME_OVER',
          playersState: [{ id: '1', name: 'Alice' }],
        }}
        userId="1"
      />
    )

    expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GameOver from '../../components/GameOver'
import { returnToLobby } from '../../services/game'

vi.mock('../../services/game', () => ({
  returnToLobby: vi.fn(),
}))

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

  /*
   * Leaving a finished game.
   *
   * The button used to be `window.location.href = '/lobby'` — a navigation that
   * told the server nothing. A decided game had no way out: GAME_OVER refuses
   * new players and holds a roster of one, and the only thing that cleared it
   * was gated behind ENV=testing. So the browser arrived at a lobby it could
   * neither add to nor start a game from, and the only escape was a server
   * restart.
   */
  describe('returning to the lobby', () => {
    beforeEach(() => {
        returnToLobby.mockReset()
        returnToLobby.mockResolvedValue({ state: 'WAITING_FOR_PLAYERS' })
    })

    const gameOver = {
        state: 'GAME_OVER',
        playersState: [{ id: '1', name: 'Alice' }],
        finalStandings: [
            { id: '1', name: 'Alice', isEliminated: false },
            { id: '2', name: 'Bob', isEliminated: true },
        ],
    }

    it('asks the server to reset the game', async () => {
        render(<GameOver gameState={gameOver} userId="1" onReturnedToLobby={() => {}} />)

        fireEvent.click(screen.getByRole('button', { name: 'Back to Lobby' }))

        await waitFor(() => expect(returnToLobby).toHaveBeenCalledTimes(1))
    })

    it('navigates only after the reset succeeds', async () => {
        // Order matters. Navigating first would land the player in a lobby the
        // server still believes is a finished game.
        const order = []
        returnToLobby.mockImplementation(() => {
            order.push('reset')
            return Promise.resolve({})
        })
        render(
            <GameOver
                gameState={gameOver}
                userId="1"
                onReturnedToLobby={() => order.push('navigate')}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Back to Lobby' }))

        await waitFor(() => expect(order).toEqual(['reset', 'navigate']))
    })

    it('stays put and can retry when the reset fails', async () => {
        // The failure mode that mattered: a reset the server refused used to
        // leave the player walking into a dead lobby with no way back.
        returnToLobby.mockRejectedValue(new Error('nope'))
        const onReturnedToLobby = vi.fn()
        render(<GameOver gameState={gameOver} userId="1" onReturnedToLobby={onReturnedToLobby} />)

        fireEvent.click(screen.getByRole('button', { name: 'Back to Lobby' }))

        await waitFor(() => expect(screen.getByRole('button', { name: 'Back to Lobby' })).toBeEnabled())
        expect(onReturnedToLobby).not.toHaveBeenCalled()
    })

    it('does not fire twice while the reset is in flight', async () => {
        let release
        returnToLobby.mockImplementation(() => new Promise((resolve) => { release = resolve }))
        render(<GameOver gameState={gameOver} userId="1" onReturnedToLobby={() => {}} />)

        const button = screen.getByRole('button', { name: 'Back to Lobby' })
        fireEvent.click(button)
        fireEvent.click(screen.getByRole('button', { name: /Returning/ }))

        expect(returnToLobby).toHaveBeenCalledTimes(1)
        release({})
    })
  })

  /*
   * The standings come from `finalStandings`, not `playersState`.
   *
   * The roster holds survivors only — `next_turn()` deletes a player the moment
   * their last card goes — so a finished game has exactly one player in it and
   * the ranking could only ever render a single row. Reading the roster made
   * "player rankings" decorative.
   */
  describe('final standings', () => {
    it('ranks the eliminated players that the roster no longer contains', () => {
        render(
            <GameOver
                gameState={{
                    state: 'GAME_OVER',
                    // The roster is down to the winner: this is all a live game
                    // ever holds once it is over.
                    playersState: [{ id: '1', name: 'Alice', isEliminated: false }],
                    finalStandings: [
                        { id: '1', name: 'Alice', isEliminated: false },
                        { id: '2', name: 'Bob', isEliminated: true },
                        { id: '3', name: 'Charlie', isEliminated: true },
                    ],
                }}
                userId="1"
            />
        )

        expect(screen.getByText('Bob')).toBeInTheDocument()
        expect(screen.getByText('Charlie')).toBeInTheDocument()
        expect(screen.getAllByText('Eliminated')).toHaveLength(2)
    })

    it('names the winner from the standings, not the first row', () => {
        // Winner first is the server's ordering, but the winner is identified by
        // the flag rather than by position, so a reordering cannot turn a loser
        // into the headline.
        render(
            <GameOver
                gameState={{
                    state: 'GAME_OVER',
                    playersState: [],
                    finalStandings: [
                        { id: '2', name: 'Bob', isEliminated: true },
                        { id: '1', name: 'Alice', isEliminated: false },
                    ],
                }}
                userId="3"
            />
        )

        expect(screen.getByText('Alice wins the game!')).toBeInTheDocument()
    })
  })
})

  /*
   * Hooks must not sit below the `return null`.
   *
   * The component returns nothing until the game is decided, so a hook placed
   * after that early return is a *conditional* hook: the component calls a
   * different number of hooks depending on the game state, and React throws
   * "Rendered fewer hooks than expected" the first time a re-render crosses
   * the boundary.
   *
   * That is not a hypothetical ordering — it is precisely what happens when the
   * game ends while the player is already watching the board, which is the
   * normal way anyone reaches this screen. It survived an earlier round of
   * tests because none of them re-rendered across the transition, so it is
   * pinned here: the overlay starts absent, appears, and the render must
   * survive.
   */
  it('survives a re-render across the game-over boundary', () => {
    const gameState = {
      state: 'WAITING_FOR_ACTION',
      playersState: [{ id: '1', name: 'Alice' }],
    }
    const { rerender, container } = render(
      <GameOver gameState={gameState} userId="1" onReturnedToLobby={() => {}} />
    )
    expect(container.firstChild).toBeNull()

    // The game is decided while the component is already mounted.
    rerender(
      <GameOver
        gameState={{ ...gameState, state: 'GAME_OVER' }}
        userId="1"
        onReturnedToLobby={() => {}}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // And back again, so a rematch's broadcast cannot trip it either.
    rerender(
      <GameOver gameState={gameState} userId="1" onReturnedToLobby={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

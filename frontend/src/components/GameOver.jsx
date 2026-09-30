import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'
import { createTimeline, stagger } from 'animejs'
import { useCallback, useState } from 'react'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, STAGGER, spring, selAll } from '../utils/motion'
import { returnToLobby } from '../services/game'

/**
 * GameOver — displayed when only one player remains.
 *
 * The one moment in the app where a full sequence is warranted: the game is
 * decided, nothing is waiting on the player, and the reveal is the payoff. The
 * sequence is ordered by viewer priority — who won, then that it happened,
 * then the rest of the standings — so the most important information is never
 * still fading in.
 *
 * **Leaving is a request, not a link.** The button used to be
 * `window.location.href = '/lobby'`, which navigated without telling the server
 * anything. A decided game had no way out — `GAME_OVER` refuses new players and
 * holds a roster of one, and the only thing that cleared it was an endpoint
 * gated behind `ENV=testing` — so the browser arrived at a lobby it could
 * neither add to nor start a game from. The reset now happens first and
 * navigation follows it; if it fails the player stays put and can try again,
 * rather than being dropped into a dead lobby.
 *
 * The standings come from `finalStandings`, not `playersState`. The roster holds
 * survivors only — a player is deleted the moment their last card goes — so a
 * finished game has exactly one player in it and the ranking could only ever
 * render a single row.
 */
function GameOver({ gameState, userId, onReturnedToLobby }) {
    // Declared before the early return below, which does not affect the hook.
    const [isLeaving, setIsLeaving] = useState(false)
    const [rootRef] = useAnimeScope((root) => {
        const tl = createTimeline({ defaults: { ease: EASE.entrance } })

        tl.add(selAll(root, styles.gameOverOverlay), {
            opacity: { from: 0 },
            duration: DURATION.normal,
        })
            .add(selAll(root, styles.gameOverModal), {
                opacity: { from: 0 },
                scale: { from: 0.94 },
                translateY: { from: 20 },
                // Spring rather than a fixed duration — this is the one moment
                // allowed to overshoot, because it is the payoff. A spring ease
                // derives its own duration from the physics, so no `duration`
                // is passed: setting both would silently drop one. Damping is
                // raised to 22, which makes this critically damped and keeps
                // the overshoot around 1% rather than the ~5% a softer spring
                // would give on a surface this large.
                ease: spring.soft(),
            }, '+=60')
            .add(selAll(root, styles.gameOverTitle), {
                opacity: { from: 0 },
                scale: { from: 0.9 },
                duration: DURATION.normal,
            }, '+=140')
            .add(selAll(root, styles.gameOverWinner), {
                opacity: { from: 0 },
                translateY: { from: 8 },
                duration: DURATION.normal,
            }, '+=100')
            .add(selAll(root, styles.gameOverPlayer), {
                opacity: { from: 0 },
                translateX: { from: -12 },
                duration: DURATION.normal,
                delay: stagger(STAGGER.list),
            }, '+=100')
            .add(root.querySelectorAll(`.${styles.gameOverModal} button`), {
                opacity: { from: 0 },
                translateY: { from: 10 },
                duration: DURATION.normal,
            }, '+=120')
        // GameOver renders nothing until the game is decided, so on the render
        // that first shows the overlay there is no scope yet. Keying on the
        // state transition is what runs the reveal for the first time.
    }, [gameState?.state])

    // Above the early return below, deliberately. A hook placed after it is a
    // conditional hook: the component calls a different number of hooks
    // depending on whether the game is decided, and React throws "Rendered
    // fewer hooks than expected" the first time a re-render crosses that
    // boundary — which is exactly what happens when the game ends while the
    // player is already looking at the board. It survived the first round of
    // tests because none of them re-rendered across the transition.
    //
    // Reset first, navigate second, and only navigate on success. A rejected
    // reset leaves the player on the game-over screen, which is recoverable;
    // navigating regardless would put them in a lobby the server still believes
    // is a finished game.
    const handleReturnToLobby = useCallback(async () => {
        if (isLeaving) return
        setIsLeaving(true)
        try {
            await returnToLobby()
            onReturnedToLobby?.()
        } catch (error) {
            console.error('Could not return to the lobby:', error)
            setIsLeaving(false)
        }
    }, [isLeaving, onReturnedToLobby])

    if (!gameState || gameState.state !== 'GAME_OVER') return null

    const standings = gameState.finalStandings || gameState.playersState || []
    const winner = standings.find(p => !p.isEliminated) || standings[0]
    const isWinner = Boolean(winner) && winner.id === userId

    return (
        <div className={styles.gameOverOverlay} ref={rootRef}>
            <div
                className={styles.gameOverModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-over-title"
            >
                <h2 className={styles.gameOverTitle} id="game-over-title">
                    {isWinner ? 'You Won!' : 'Game Over'}
                </h2>
                {winner && (
                    <p className={styles.gameOverWinner}>
                        {isWinner ? 'Congratulations!' : `${winner.name} wins the game!`}
                    </p>
                )}
                <div className={styles.gameOverPlayers}>
                    {standings.map((player, index) => (
                        <div
                            key={player.id}
                            className={`${styles.gameOverPlayer} ${player.id === userId ? styles.gameOverPlayerSelf : ''}`}
                        >
                            <span className={styles.gameOverRank}>#{index + 1}</span>
                            <span className={styles.gameOverName}>{player.name}</span>
                            {player.id === userId && <span className={styles.youBadge}>You</span>}
                            {player.isEliminated && (
                                <span className={styles.gameOverEliminated}>Eliminated</span>
                            )}
                        </div>
                    ))}
                </div>
                <PrimaryButton
                    text={isLeaving ? 'Returning…' : 'Back to Lobby'}
                    onClick={handleReturnToLobby}
                    disabled={isLeaving}
                />
            </div>
        </div>
    )
}

export default GameOver

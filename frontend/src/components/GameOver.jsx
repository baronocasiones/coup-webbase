import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'
import { createTimeline, stagger } from 'animejs'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, STAGGER, spring, selAll } from '../utils/motion'

/**
 * GameOver — displayed when only one player remains.
 *
 * The one moment in the app where a full sequence is warranted: the game is
 * decided, nothing is waiting on the player, and the reveal is the payoff. The
 * sequence is ordered by viewer priority — who won, then that it happened,
 * then the rest of the standings — so the most important information is never
 * still fading in.
 */
function GameOver({ gameState, userId }) {
    // Declared before the early return below, which does not affect the hook.
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

    if (!gameState || gameState.state !== 'GAME_OVER') return null

    const players = gameState.playersState || []
    const winner = players[0]
    const isWinner = winner?.id === userId

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
                    {players.map((player, index) => (
                        <div
                            key={player.id}
                            className={`${styles.gameOverPlayer} ${player.id === userId ? styles.gameOverPlayerSelf : ''}`}
                        >
                            <span className={styles.gameOverRank}>#{index + 1}</span>
                            <span className={styles.gameOverName}>{player.name}</span>
                            {player.id === userId && <span className={styles.youBadge}>You</span>}
                        </div>
                    ))}
                </div>
                <PrimaryButton text="Back to Lobby" onClick={() => window.location.href = '/lobby'} />
            </div>
        </div>
    )
}

export default GameOver

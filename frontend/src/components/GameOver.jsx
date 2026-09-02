import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'

/**
 * GameOver — displayed when only one player remains.
 */
function GameOver({ gameState, userId }) {
    if (!gameState || gameState.state !== 'GAME_OVER') return null

    const players = gameState.playersState || []
    const winner = players[0]
    const isWinner = winner?.id === userId

    return (
        <div className={styles.gameOverOverlay}>
            <div className={styles.gameOverModal}>
                <h2 className={styles.gameOverTitle}>
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

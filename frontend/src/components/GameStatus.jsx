import styles from '../styles/PlayRoom.module.css'

/**
 * GameStatus — displays the current game state announcement.
 * Shows what action was declared, who declared it, and any block/challenge info.
 */
function GameStatus({ gameState, userId }) {
    if (!gameState) return null

    const { state, declaredMove, declaredBlock, currentTurn, challengeLoser } = gameState
    const isMyTurn = currentTurn?.id === userId

    const getStateMessage = () => {
        switch (state) {
            case 'WAITING_FOR_ACTION':
                return isMyTurn
                    ? "It's your turn — choose an action"
                    : `Waiting for ${currentTurn?.name ?? 'Unknown'}...`
            case 'ACTION_DECLARED':
                return declaredMove
                    ? `${currentTurn?.name ?? 'Someone'} declared ${formatMove(declaredMove)}`
                    : 'Action declared'
            case 'BLOCK_DECLARED':
                return declaredBlock
                    ? `Block declared: ${formatBlock(declaredBlock)}`
                    : 'Block declared'
            case 'CHALLENGE_HANDLE':
                return 'Challenge in progress...'
            case 'PENDING_EXCHANGE':
                return isMyTurn
                    ? 'Choose cards to keep'
                    : `${currentTurn?.name ?? 'Someone'} is exchanging cards...`
            case 'INFLUENCE_SELECTION_PENDING':
                return isMyTurn
                    ? 'Choose a card to lose'
                    : `${currentTurn?.name ?? 'Someone'} must choose a card to lose`
            case 'GAME_OVER':
                return 'Game Over'
            default:
                return ''
        }
    }

    const getStateBadge = () => {
        switch (state) {
            case 'ACTION_DECLARED': return { label: 'Action', color: 'gold' }
            case 'BLOCK_DECLARED': return { label: 'Block', color: 'info' }
            case 'CHALLENGE_HANDLE': return { label: 'Challenge', color: 'danger' }
            case 'PENDING_EXCHANGE': return { label: 'Exchange', color: 'info' }
            case 'INFLUENCE_SELECTION_PENDING': return { label: 'Eliminate', color: 'danger' }
            case 'GAME_OVER': return { label: 'Game Over', color: 'danger' }
            default: return null
        }
    }

    const badge = getStateBadge()
    const message = getStateMessage()

    if (!message) return null

    const isPulsing = state === 'ACTION_DECLARED' || state === 'BLOCK_DECLARED' || state === 'CHALLENGE_HANDLE'

    return (
        <div className={`${styles.gameStatus} ${isPulsing ? styles.statusPulse : ''}`}>
            {badge && (
                <span className={`${styles.statusBadge} ${styles[`badge${badge.color}`]}`}>
                    {badge.label}
                </span>
            )}
            <span className={styles.statusMessage}>{message}</span>
            {challengeLoser && (
                <span className={styles.challengeResult}>
                    {challengeLoser.name} lost the challenge
                </span>
            )}
        </div>
    )
}

function formatMove(move) {
    return move.toLowerCase().replace(/_/g, ' ')
}

function formatBlock(block) {
    return block.toLowerCase().replace(/_/g, ' ')
}

export default GameStatus

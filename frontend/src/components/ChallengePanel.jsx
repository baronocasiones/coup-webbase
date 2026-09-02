import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'
import { BLOCKABLE_ACTIONS } from '../utils/gameActions'

/**
 * ChallengePanel — shows challenge and block options when an action is declared.
 * Appears for other players when an action or block is in progress.
 */
function ChallengePanel({ gameState, userId, onChallenge, onNoChallenge, onBlock }) {
    if (!gameState) return null

    const { state, declaredMove, currentTurn } = gameState
    const isMyTurn = currentTurn?.id === userId

    // Don't show if it's your own action (you can't challenge yourself)
    if (isMyTurn) return null

    // Show challenge/block options during ACTION_DECLARED
    if (state === 'ACTION_DECLARED' && declaredMove) {
        const isBlockable = BLOCKABLE_ACTIONS[declaredMove]
        const isChallengeable = !['INCOME', 'COUP', 'FOREIGN AID'].includes(declaredMove)

        return (
            <div className={styles.challengePanel}>
                <span className={styles.challengeLabel}>Respond to {declaredMove}</span>
                <div className={styles.challengeActions}>
                    {isChallengeable && (
                        <>
                            <PrimaryButton text="Challenge" variant="danger" onClick={onChallenge} />
                            <PrimaryButton text="Pass" variant="secondary" onClick={onNoChallenge} />
                        </>
                    )}
                    {isBlockable && !isChallengeable && (
                        <>
                            <PrimaryButton text="Block" onClick={() => onBlock(isBlockable[0])} />
                            <PrimaryButton text="Pass" variant="secondary" onClick={onNoChallenge} />
                        </>
                    )}
                    {isBlockable && isChallengeable && (
                        <PrimaryButton text={`Block (${isBlockable[0]})`} onClick={() => onBlock(isBlockable[0])} />
                    )}
                    {!isBlockable && !isChallengeable && (
                        <PrimaryButton text="Pass" variant="secondary" onClick={onNoChallenge} />
                    )}
                </div>
            </div>
        )
    }

    // Show challenge option during BLOCK_DECLARED
    if (state === 'BLOCK_DECLARED') {
        return (
            <div className={styles.challengePanel}>
                <span className={styles.challengeLabel}>Block declared — challenge it?</span>
                <div className={styles.challengeActions}>
                    <PrimaryButton text="Challenge Block" variant="danger" onClick={onChallenge} />
                    <PrimaryButton text="Accept Block" variant="secondary" onClick={onNoChallenge} />
                </div>
            </div>
        )
    }

    return null
}

export default ChallengePanel

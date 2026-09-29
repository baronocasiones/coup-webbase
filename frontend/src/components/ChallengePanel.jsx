import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'
import { createTimeline, stagger } from 'animejs'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, STAGGER, selAll } from '../utils/motion'
import { BLOCKABLE_ACTIONS } from '../utils/gameActions'

/**
 * ChallengePanel — shows challenge and block options when an action is declared.
 * Appears for other players when an action or block is in progress.
 *
 * This panel is on a clock: it only exists while someone else is waiting on
 * your response, so its entrance is one of the shortest in the app. The
 * response options still stagger in reading order, which is the one piece of
 * choreography worth the 50ms — it presents "Challenge, then Pass" as a
 * sequence rather than two equal buttons, and the destructive option is named
 * first.
 */
function ChallengePanel({ gameState, userId, onChallenge, onNoChallenge, onBlock }) {
    const state = gameState?.state
    const declaredMove = gameState?.declaredMove
    const isMyTurn = gameState?.currentTurn?.id === userId

    const [rootRef] = useAnimeScope((root) => {
        if (!gameState || isMyTurn) return

        createTimeline({ defaults: { ease: EASE.entrance } })
            .add(selAll(root, styles.challengePanel), {
                opacity: { from: 0 },
                scale: { from: 0.97 },
                translateY: { from: -10 },
                duration: DURATION.fast,
            })
            .add(selAll(root, styles.challengeLabel), {
                opacity: { from: 0 },
                translateX: { from: -8 },
                duration: DURATION.fast,
            }, '+=40')
            .add(root.querySelectorAll(`.${styles.challengeActions} button`), {
                opacity: { from: 0 },
                translateY: { from: 8 },
                duration: DURATION.fast,
                delay: stagger(STAGGER.list),
            }, '+=40')
    }, [state, declaredMove])

    if (!gameState) return null

    // Don't show if it's your own action (you can't challenge yourself)
    if (isMyTurn) return null

    // Show challenge/block options during ACTION_DECLARED
    if (state === 'ACTION_DECLARED' && declaredMove) {
        const isBlockable = BLOCKABLE_ACTIONS[declaredMove]
        const isChallengeable = !['INCOME', 'COUP', 'FOREIGN AID'].includes(declaredMove)

        return (
            <div className={styles.challengePanel} ref={rootRef}>
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
            <div className={styles.challengePanel} ref={rootRef}>
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

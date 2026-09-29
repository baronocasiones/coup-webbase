import { createTimeline } from 'animejs'
import styles from '../styles/PlayRoom.module.css'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, selAll } from '../utils/motion'

/**
 * GameStatus — displays the current game state announcement.
 * Shows what action was declared, who declared it, and any block/challenge info.
 *
 * Split of responsibilities: anime.js drives the *entrance* on every state
 * change, which is discrete and state-driven. The continuous `.statusPulse`
 * breathing stays in CSS, because an infinite ambient loop is better served by
 * a stylesheet than by a JS timer holding a frame budget.
 */
function GameStatus({ gameState, userId }) {
    const state = gameState?.state
    const declaredMove = gameState?.declaredMove
    const declaredBlock = gameState?.declaredBlock
    const currentTurn = gameState?.currentTurn
    const challengeLoser = gameState?.challengeLoser
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
    const isPulsing = state === 'ACTION_DECLARED' || state === 'BLOCK_DECLARED' || state === 'CHALLENGE_HANDLE'

    /**
     * Re-announce on every state transition.
     *
     * The banner is one long-lived element, so a one-shot CSS keyframe — which
     * is what this used to be — only ever played on the first render. Keying
     * the timeline on the message text means a block landing while you were
     * already looking at the banner still registers as a change.
     */
    const announcementKey = `${message}|${badge?.label ?? ''}|${challengeLoser?.id ?? ''}`

    const [rootRef] = useAnimeScope((root) => {
        if (!message) return

        const tl = createTimeline({ defaults: { ease: EASE.entrance } })

        tl.add(selAll(root, styles.statusMessage), {
            opacity: { from: 0 },
            translateY: { from: -8 },
            duration: DURATION.fast,
        })

        if (badge) {
            tl.add(selAll(root, styles.statusBadge), {
                opacity: { from: 0 },
                scale: { from: 0.7 },
                duration: DURATION.fast,
            }, '+=40')
        }

        if (challengeLoser) {
            tl.add(selAll(root, styles.challengeResult), {
                opacity: { from: 0 },
                translateX: { from: -8 },
                duration: DURATION.fast,
            }, '+=80')
        }
    }, [announcementKey])

    if (!gameState) return null
    if (!message) return null

    return (
        <div
            className={`${styles.gameStatus} ${isPulsing ? styles.statusPulse : ''}`}
            ref={rootRef}
            /*
             * The entire turn sequence — whose turn, what was declared, what
             * was blocked, who lost the challenge — arrives as text mutations
             * into this one long-lived element. Without a live region a screen
             * reader user is never told any of it changed, which in a bluffing
             * game is the difference between playing and not. The entrance
             * animation below is the visual channel for the same event; neither
             * is sufficient alone.
             *
             * `aria-atomic` so a change that swaps both the badge and the
             * message is announced as one phrase rather than two fragments.
             */
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
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

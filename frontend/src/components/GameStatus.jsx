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

    /*
     * Name the blocker. "Block declared: block foreign aid" named nobody, so a
     * player deciding whether to challenge a block had to work out whose it was
     * by elimination from the board. `blockerId` is on the public state for
     * exactly this, and for ChallengePanel's guard against the blocker
     * answering their own block.
     */
    const blockerName = gameState?.playersState?.find(p => p.id === gameState?.blockerId)?.name

    /*
     * Name the player who has to give up an influence card.
     *
     * This is *not* the same as `blockerName`'s sibling question, and using
     * `isMyTurn` here was the bug: after a Coup or Assassinate the target owes
     * a card, but `currentTurn` still names the player who attacked, because the
     * turn only advances once the surrender is made. So the attacker was told to
     * choose a card from their own hand — a selection the server rejects — and
     * the target, the only player who can legally act, was told the attacker's
     * name. `pendingInfluenceTarget` is the id of the player the server is
     * actually waiting on.
     */
    const pendingTargetId = gameState?.pendingInfluenceTarget
    const pendingTargetName = gameState?.playersState?.find(p => p.id === pendingTargetId)?.name

    /*
     * Who the declared action is aimed at, when it is aimed at anyone.
     *
     * A block answers being hit, so whoever is named here is the only player
     * who may block — the rest of the table is deciding whether to challenge.
     * Naming the target makes the message match the choice being offered, which
     * is otherwise a bare "Action declared" naming nobody. It also tells a
     * bystander that the action is not about them, which is the difference
     * between reading the table and guessing.
     */
    const moveTargetId = gameState?.moveTargetId
    const moveTargetName = gameState?.playersState?.find(p => p.id === moveTargetId)?.name

    const getStateMessage = () => {
        switch (state) {
            case 'WAITING_FOR_ACTION':
                return isMyTurn
                    ? "It's your turn — choose an action"
                    : `Waiting for ${currentTurn?.name ?? 'Unknown'}...`
            case 'ACTION_DECLARED':
                if (!declaredMove) return 'Action declared'
                // "declared Steal from Bob" when there is someone to name. The
                // phrasing stays the same either way, so the fallback is the
                // actor rather than a visibly truncated sentence.
                return moveTargetName
                    ? `${currentTurn?.name ?? 'Someone'} declared ${formatMove(declaredMove)} from ${moveTargetName}`
                    : `${currentTurn?.name ?? 'Someone'} declared ${formatMove(declaredMove)}`
            case 'BLOCK_DECLARED':
                return declaredBlock
                    ? `${blockerName ?? 'Someone'} blocked with ${formatBlock(declaredBlock)}`
                    : 'Block declared'
            case 'CHALLENGE_HANDLE':
                return 'Challenge in progress...'
            case 'PENDING_EXCHANGE':
                return isMyTurn
                    ? 'Choose cards to keep'
                    : `${currentTurn?.name ?? 'Someone'} is exchanging cards...`
            case 'INFLUENCE_SELECTION_PENDING':
                return pendingTargetId === userId
                    ? 'Choose a card to lose'
                    : `${pendingTargetName ?? 'Someone'} must choose a card to lose`
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
    const announcementKey = `${message}|${badge?.label ?? ''}|${challengeLoser?.id ?? ''}|${blockerName ?? ''}`

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
    // "BLOCK FOREIGN AID" -> "foreign aid". The "block" prefix is redundant on
    // a sentence that already says who blocked, and it is already on the badge.
    return block.toLowerCase().replace(/^block /, '').replace(/_/g, ' ')
}

export default GameStatus

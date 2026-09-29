import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'
import { createTimeline, stagger } from 'animejs'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, STAGGER, selAll } from '../utils/motion'
import { BLOCKABLE_ACTIONS, BLOCK_REQUIRES, TARGETABLE_ACTIONS, UNCHALLENGEABLE_ACTIONS } from '../utils/gameActions'

/**
 * ChallengePanel — shows the response options for a declared move.
 *
 * **Who sees it is decided by the caller, not by this component.** `PlayRoom`
 * computes a single `visible` predicate, because the rule inverts between
 * states: during ACTION_DECLARED it is everyone except the player who declared
 * the move, and during BLOCK_DECLARED it is only that player, because the
 * blocked action's owner is the one who decides whether the block stands. This
 * component used to re-derive that with an unconditional `isMyTurn` check,
 * which is correct for the first case and exactly backwards for the second.
 *
 * The `blockerId` check below is a second, narrower guard: the blocker can
 * never answer their own block, whatever the caller decides.
 *
 * **Bluffing is never blocked, but only the target may block at all.** Those
 * are separate questions. Who may block is a rules question: a block answers
 * being *hit*, so for a targeted action (Steal, Assassination) only the target
 * gets the button and the rest of the table may challenge or pass. Foreign Aid
 * has no target and any player may block it. Whether the blocker could *back*
 * the block is not a question at all — a block the player cannot back is still
 * offered, only labelled, because claiming an influence you do not hold is the
 * bluff and challenging it is how bluffs get caught. Hiding it would remove the
 * bluff from the game and leave `get_challenge_loser()`'s lying-blocker branch
 * unreachable. This matches the action buttons, which are likewise never
 * disabled for a missing influence.
 *
 * This panel is on a clock: it only exists while someone else is waiting on
 * your response, so its entrance is one of the shortest in the app. The
 * response options still stagger in reading order, which is the one piece of
 * choreography worth the 50ms — it presents the options as a sequence rather
 * than three equal buttons, and the destructive option is named first.
 */
function ChallengePanel({ visible, gameState, userId, cards, onChallenge, onNoChallenge, onBlock }) {
    const state = gameState?.state
    const declaredMove = gameState?.declaredMove
    const declaredBlock = gameState?.declaredBlock
    const blockerId = gameState?.blockerId
    const currentTurnId = gameState?.currentTurn?.id

    // The blocker must not resolve their own block. Cheaper to check than to
    // reason about who else might be mispaired, and it is the one invariant
    // that costs a game its integrity.
    const isBlocker = state === 'BLOCK_DECLARED' && blockerId === userId

    const [rootRef] = useAnimeScope((root) => {
        if (!gameState || !visible) return

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
    }, [state, declaredMove, declaredBlock, visible, currentTurnId])

    if (!gameState || !visible) return null

    /* Responding to a block: the blocked player either challenges it or lets it
     * stand. There is no third option and no second block to offer. */
    if (state === 'BLOCK_DECLARED') {
        if (isBlocker) return null

        return (
            <div className={styles.challengePanel} ref={rootRef}>
                <span className={styles.challengeLabel}>
                    {describeBlock(blockerId, gameState.playersState, declaredBlock)} — challenge it?
                </span>
                <div className={styles.challengeActions}>
                    <PrimaryButton text="Challenge Block" variant="danger" onClick={onChallenge} />
                    <PrimaryButton text="Accept Block" variant="secondary" onClick={onNoChallenge} />
                </div>
            </div>
        )
    }

    /* Responding to a declared action. Every blockable action is *also*
     * challengeable except Foreign Aid, and the previous four-way branch here
     * rendered Block alone for the overlapping case — so during a Steal or an
     * Assassinate the table was offered no way to challenge and no way to pass,
     * only to block. The options are now composed independently. */
    if (state === 'ACTION_DECLARED' && declaredMove) {
        const isChallengeable = !UNCHALLENGEABLE_ACTIONS.includes(declaredMove)
        const blockMoves = BLOCKABLE_ACTIONS[declaredMove] || []
        const blockMove = blockMoves[0]

        /*
         * Who may block, as opposed to who may *back* a block.
         *
         * These are different questions and conflating them is what put a Block
         * button in front of the whole table. A block answers being hit, so for a
         * targeted action only the target may block it — the rest of the table
         * may still challenge or pass. Foreign Aid has no target and any player
         * may block it, so the gate only applies when there is a target to
         * compare against. `moveTargetId` has to be on the wire for this: it is
         * the only thing that identifies the player being hit.
         *
         * Whether this player could *back* the block stays information rather
         * than a gate. Claiming an influence you do not hold is the bluff, and
         * challenging it is how bluffs get caught.
         */
        const isTargeted = TARGETABLE_ACTIONS.includes(declaredMove)
        const isTarget = gameState?.moveTargetId === userId
        const mayBlock = Boolean(blockMove) && (!isTargeted || isTarget)

        // Whether this player could back it is information, not a gate.
        const backable = (BLOCK_REQUIRES[blockMove] || []).filter(card => cards.includes(card))
        const isBluffBlock = Boolean(blockMove) && backable.length === 0

        return (
            <div className={styles.challengePanel} ref={rootRef}>
                <span className={styles.challengeLabel}>Respond to {declaredMove}</span>
                <div className={styles.challengeActions}>
                    {isChallengeable && (
                        <PrimaryButton text="Challenge" variant="danger" onClick={onChallenge} />
                    )}
                    {mayBlock && (
                        <PrimaryButton
                            text={`Block (${blockMove})`}
                            onClick={() => onBlock(blockMove)}
                            bluff={isBluffBlock}
                            title={
                                isBluffBlock
                                    ? `You don't hold a ${(BLOCK_REQUIRES[blockMove] || []).join(' or ')} — this is a bluff!`
                                    : undefined
                            }
                        />
                    )}
                    <PrimaryButton text="Pass" variant="secondary" onClick={onNoChallenge} />
                </div>
            </div>
        )
    }

    return null
}

function formatBlock(block) {
    if (!block) return 'a block'
    return String(block).toLowerCase().replace(/^block /, '').replace(/_/g, ' ')
}

/** "Alice blocked with contessa", degrading gracefully when the id is unknown. */
function describeBlock(blockerId, players, declaredBlock) {
    const name = players?.find(p => p.id === blockerId)?.name
    const what = formatBlock(declaredBlock)
    return name ? `${name} blocked with ${what}` : `Blocked with ${what}`
}

export default ChallengePanel

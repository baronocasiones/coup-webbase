import { createTimeline, stagger } from 'animejs'
import styles from '../styles/PlayRoom.module.css'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, STAGGER, selAll } from '../utils/motion'

const CARD_ICONS = {
    DUKE: '👑',
    ASSASSIN: '🗡️',
    CAPTAIN: '⚓',
    AMBASSADOR: '📜',
    CONTESSA: '🛡️',
}

/**
 * InfluencePicker — lets a player choose which card to lose after
 * Coup / Assassinate / a lost challenge.
 *
 * Same deal-in as the Exchange picker, inverted in tone: the cards come in and
 * settle rather than bounce, and they arrive front-to-back. Choosing what to
 * sacrifice is a grim decision, and the motion stays quiet enough not to make
 * it feel like a reward.
 *
 * Returns null while hidden, so `visible` in the scope deps is what lets the
 * entrance replay on each opening.
 */
function InfluencePicker({ visible, cards, onSelect }) {
    // See ExchangeModal: depend on the contents, not the array reference, or
    // the deal replays on every game-state refetch.
    const cardKey = (cards ?? []).join(",");

    const [rootRef] = useAnimeScope((root) => {
        if (!visible) return

        const tl = createTimeline({ defaults: { ease: EASE.entrance } })

        tl.add(selAll(root, styles.exchangeOverlay), {
            opacity: { from: 0 },
            duration: DURATION.fast,
        })
            .add(selAll(root, styles.exchangeModal), {
                opacity: { from: 0 },
                scale: { from: 0.94 },
                translateY: { from: 18 },
                duration: DURATION.normal,
            }, '+=30')
            .add(selAll(root, styles.exchangeHeader), {
                opacity: { from: 0 },
                translateY: { from: -8 },
                duration: DURATION.normal,
            }, '+=90')
            .add(selAll(root, styles.exchangeCard), {
                opacity: { from: 0 },
                rotateY: { from: -90 },
                scale: { from: 0.85 },
                duration: DURATION.normal,
                delay: stagger(STAGGER.card, { from: 'last' }),
            }, '+=80')
    }, [visible, cardKey])

    if (!visible || !cards || cards.length === 0) return null

        return (
        <div
            className={styles.exchangeOverlay}
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="influence-picker-title"
        >
            <div className={styles.exchangeModal}>
                <div className={styles.exchangeHeader}>
                    <span className={styles.statusBadge + ' ' + styles.badgedanger}>Influence Lost</span>
                    <h3 className={styles.exchangeTitle} id="influence-picker-title">
Choose a card to lose</h3>
                    <p className={styles.exchangeDesc}>
                        You must permanently remove one influence card.
                    </p>
                </div>
                <div className={styles.exchangeCards}>
                    {cards.map((card, index) => (
                        <button
                            key={index}
                            type="button"
                            className={styles.exchangeCard}
                            onClick={() => onSelect(card)}
                            /*
                             * Matching ExchangeModal, which already labels its
                             * cards this way. Beyond consistency it gives these
                             * buttons a stable selector: the accessible name
                             * alone is ambiguous here, because a hand holding a
                             * pair renders two identical names and a
                             * name-keyed click can only ever reach one of them.
                             */
                            aria-label={`Select ${card}`}
                        >
                            <span className={styles.exchangeCardIcon}>{CARD_ICONS[card] || '?'}</span>
                            <span className={styles.exchangeCardName}>{card}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default InfluencePicker

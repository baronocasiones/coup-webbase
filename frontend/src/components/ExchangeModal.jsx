import { useState } from 'react'
import { createTimeline, stagger } from 'animejs'
import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'
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
 * ExchangeModal — lets the current player choose which cards to keep during Exchange.
 * Shows drawn cards + current cards, player selects N to keep.
 *
 * The drawn cards are dealt in on a rotateY flip rather than faded up, because
 * this is the one moment the app hands you physical objects. You are literally
 * drawing from the court deck, and the flip is the only entrance that reads as
 * "these came off the deck" rather than "these were already here".
 *
 * The component returns null while hidden, so it mounts fresh each time it
 * opens and the deal replays naturally.
 */
function ExchangeModal({ visible, cards, currentCardCount, onSelect }) {
    const [selected, setSelected] = useState([])

    // `cards` arrives as a fresh array on every refetch, so depend on what the
    // picker actually shows rather than the reference — otherwise the deal
    // would replay on every unrelated game-state poll.
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
            // Back to front, so each card is briefly visible before the one in
            // front of it lands.
            .add(selAll(root, styles.exchangeCard), {
                opacity: { from: 0 },
                rotateY: { from: -90 },
                scale: { from: 0.85 },
                duration: DURATION.normal,
                delay: stagger(STAGGER.card, { from: 'last' }),
            }, '+=80')
            .add(selAll(root, styles.exchangeFooter), {
                opacity: { from: 0 },
                translateY: { from: 10 },
                duration: DURATION.normal,
            }, '+=120')
    }, [visible, cardKey])

    if (!visible || !cards || cards.length === 0) return null

    const toggleCard = (cardName) => {
        setSelected(prev => {
            if (prev.includes(cardName)) {
                return prev.filter(c => c !== cardName)
            }
            if (prev.length >= currentCardCount) {
                return prev
            }
            return [...prev, cardName]
        })
    }

    const handleSubmit = () => {
        if (selected.length === currentCardCount) {
            onSelect(selected)
            setSelected([])
        }
    }

        return (
        <div
            className={styles.exchangeOverlay}
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exchange-picker-title"
        >
            <div className={styles.exchangeModal}>
                <div className={styles.exchangeHeader}>
                    <span className={styles.statusBadge + ' ' + styles.badgeinfo}>Exchange</span>
                    <h3 className={styles.exchangeTitle} id="exchange-picker-title">
Choose {currentCardCount} card{currentCardCount !== 1 ? 's' : ''} to keep</h3>
                    <p className={styles.exchangeDesc}>
                        You drew {cards.length - currentCardCount} card{cards.length - currentCardCount !== 1 ? 's' : ''}.
                        Select {currentCardCount} to keep, the rest return to the deck.
                    </p>
                </div>
                <div className={styles.exchangeCards}>
                    {cards.map((card, index) => {
                        const isSelected = selected.includes(card + index)
                        return (
                            <button
                                key={index}
                                className={`${styles.exchangeCard} ${isSelected ? styles.exchangeCardSelected : ''}`}
                                onClick={() => toggleCard(card + index)}
                                disabled={selected.length >= currentCardCount && !isSelected}
                            >
                                <span className={styles.exchangeCardIcon}>{CARD_ICONS[card] || '?'}</span>
                                <span className={styles.exchangeCardName}>{card}</span>
                            </button>
                        )
                    })}
                </div>
                <div className={styles.exchangeFooter}>
                    <span className={styles.exchangeCount}>
                        {selected.length} / {currentCardCount} selected
                    </span>
                    <PrimaryButton
                        text="Confirm Selection"
                        onClick={handleSubmit}
                        disabled={selected.length !== currentCardCount}
                    />
                </div>
            </div>
        </div>
    )
}

export default ExchangeModal

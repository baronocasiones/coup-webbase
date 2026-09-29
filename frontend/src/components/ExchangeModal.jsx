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
 *
 * Selection is tracked by *index*, and the influence names are read off only at
 * submit time. The deck holds three of every influence, so two identical cards
 * in the pool are ordinary rather than exceptional, and no name-keyed scheme
 * can tell them apart. This used to key on `card + index` and submit those
 * strings, so the payload went out as `["CONTESSA0"]`, the backend's
 * `Influence[...]` lookup raised, and the error was swallowed into a WS frame
 * the client only `console.error`s — the game sat in PENDING_EXCHANGE forever.
 * The server removes from a copy of the pool, so submitting
 * `["ASSASSIN", "ASSASSIN"]` is correct and needs no special-casing.
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

    const toggleCard = (index) => {
        setSelected(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index)
            }
            if (prev.length >= currentCardCount) {
                return prev
            }
            return [...prev, index]
        })
    }

    const handleSubmit = () => {
        if (selected.length === currentCardCount) {
            onSelect(selected.map(index => cards[index]))
            setSelected([])
        }
    }

    // Never negative. A stale refetch can momentarily hand us a pool smaller
    // than the current hand, and "-1 cards" is worse than an imprecise count.
    const drawnCount = Math.max(0, cards.length - currentCardCount)

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
                        You drew {drawnCount} card{drawnCount !== 1 ? 's' : ''}.
                        Select {currentCardCount} to keep, the rest return to the deck.
                    </p>
                </div>
                <div className={styles.exchangeCards}>
                    {cards.map((card, index) => {
                        const isSelected = selected.includes(index)
                        return (
                            <button
                                key={index}
                                className={`${styles.exchangeCard} ${isSelected ? styles.exchangeCardSelected : ''}`}
                                onClick={() => toggleCard(index)}
                                disabled={selected.length >= currentCardCount && !isSelected}
                                aria-pressed={isSelected}
                                /*
                                 * The name is part of the accessible name, but the
                                 * cards are a set of toggle buttons, so say what
                                 * activating one does. It also gives tests and
                                 * drivers a stable hook: the CSS Module class
                                 * names are substring-ambiguous, since
                                 * `exchangeCard` is a prefix of
                                 * `exchangeCards`, `exchangeCardIcon` and
                                 * `exchangeCardName` alike, so a
                                 * `[class*="exchangeCard"]` selector matches
                                 * the container, every button and two spans per
                                 * button.
                                 */
                                aria-label={`Select ${card}`}
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

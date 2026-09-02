import { useState } from 'react'
import styles from '../styles/PlayRoom.module.css'
import PrimaryButton from './PrimaryButton'

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
 */
function ExchangeModal({ visible, cards, currentCardCount, onSelect }) {
    const [selected, setSelected] = useState([])

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
        <div className={styles.exchangeOverlay}>
            <div className={styles.exchangeModal}>
                <div className={styles.exchangeHeader}>
                    <span className={styles.statusBadge + ' ' + styles.badgeinfo}>Exchange</span>
                    <h3 className={styles.exchangeTitle}>Choose {currentCardCount} card{currentCardCount !== 1 ? 's' : ''} to keep</h3>
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

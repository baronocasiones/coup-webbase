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
 * InfluencePicker — lets a player choose which card to lose after Coup/Assassinate.
 */
function InfluencePicker({ visible, cards, onSelect }) {
    if (!visible || !cards || cards.length === 0) return null

    return (
        <div className={styles.exchangeOverlay}>
            <div className={styles.exchangeModal}>
                <div className={styles.exchangeHeader}>
                    <span className={styles.statusBadge + ' ' + styles.badgedanger}>Influence Lost</span>
                    <h3 className={styles.exchangeTitle}>Choose a card to lose</h3>
                    <p className={styles.exchangeDesc}>
                        You must permanently remove one influence card.
                    </p>
                </div>
                <div className={styles.exchangeCards}>
                    {cards.map((card, index) => (
                        <button
                            key={index}
                            className={styles.exchangeCard}
                            onClick={() => onSelect(card)}
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

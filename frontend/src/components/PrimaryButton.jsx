import styles from '../styles/PrimaryButton.module.css'

function PrimaryButton({ text, width, height, variant = 'primary', pulse = false, onClick, disabled = false, bluff = false, title }) {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${pulse ? styles.primaryPulse : ''} ${bluff ? styles.bluff : ''}`}
            onClick={onClick}
            disabled={disabled}
            style={{ width, height }}
            title={title}
        >
            {text}
            {bluff && <span className={styles.bluffBadge}>Bluff</span>}
        </button>
    )
}

export default PrimaryButton

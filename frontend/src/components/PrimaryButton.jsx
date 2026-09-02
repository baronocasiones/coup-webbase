import styles from '../styles/PrimaryButton.module.css'

function PrimaryButton({ text, width, height, variant = 'primary', pulse = false, onClick, disabled = false }) {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${pulse ? styles.primaryPulse : ''}`}
            onClick={onClick}
            disabled={disabled}
            style={{ width, height }}
        >
            {text}
        </button>
    )
}

export default PrimaryButton

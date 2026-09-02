import styles from '../styles/PrimaryButton.module.css'

function PrimaryButton({ text, width, height, variant = 'primary', onClick, disabled = false }) {
    return (
        <button
            className={`${styles.button} ${styles[variant]}`}
            onClick={onClick}
            disabled={disabled}
            style={{ width, height }}
        >
            {text}
        </button>
    )
}

export default PrimaryButton

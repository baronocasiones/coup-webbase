import styles from '../styles/Landing.module.css'

function PrimaryButton({ text, width, height, background='#E94560', backgroundColor, onClick, disabled = false }) {

    return (
        <button 
            className={styles.primaryButton} 
            onClick={onClick} 
            disabled={disabled}
            style={{ 
                width: width, 
                height: height, 
                background: backgroundColor || background
            }}>
            {text}
        </button>
    );
}

export default PrimaryButton;

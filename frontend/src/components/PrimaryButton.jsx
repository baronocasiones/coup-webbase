import styles from '../styles/Landing.module.css'

function PrimaryButton({ text, width, height, background='#E94560', backgroundColor}) {

    return (
        <button className={styles.primaryButton} style={{ width: width, height: height, background: background, backgroundColor: backgroundColor }}>
            {text}
        </button>
    );
}

export default PrimaryButton;

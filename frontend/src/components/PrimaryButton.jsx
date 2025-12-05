import styles from '../styles/Landing.module.css'

function  PrimaryButton({text}) {

    return ( 
        <button className={styles.primaryButton}>
            {text}
        </button>
    );
}

export default PrimaryButton;

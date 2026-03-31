import styles from '../styles/Loader.module.css'

/**
 * Loader Component
 * Displays three bouncing circles with shadows
 * GPU-accelerated animations for smooth performance
 */
const Loader = () => {
    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.circle} />
                <div className={styles.circle} />
                <div className={styles.circle} />
                <div className={styles.shadow} />
                <div className={styles.shadow} />
                <div className={styles.shadow} />
            </div>
        </div>
    )
}

export default Loader


import styles from '../styles/Chatbox.module.css'

function ChatBoxSkeleton({ }) {
    return (
        <>
            <div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
            </div>
            <div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
            </div>
            <div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText}></div>
            </div>
        </>
    )
}

export default ChatBoxSkeleton

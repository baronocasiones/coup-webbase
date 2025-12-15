import styles from './../styles/Lobby.module.css'

function Lobby() {
    return (
        <div className={styles.playerListContainer}>
            <h2>Players</h2>
            {Array.from({ length: 5 }).map((_, i) => (
                <div className={styles.player}>
                    <span className={styles.avatar}></span>
                    <div className={styles.nameContainer} key={i}>
                        <span>Baron</span>
                        <span className={styles.playerState}>Ready</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default Lobby

import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'

function Lobby() {
    return (
        <div className={styles.lobbyContainer}>
            <div className={styles.playerListContainer}>
                <h2>Players</h2>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div className={styles.player} key={i}>
                        <span className={styles.avatar}></span>
                        <div className={styles.nameContainer} key={i}>
                            <span>Baron</span>
                            <span className={styles.playerState}>Ready</span>
                        </div>
                    </div>
                ))}
                <div className={styles.gameSettings}>
                    <h2>Game Settings</h2>
                    <div className={styles.settingContainer}>
                        <div className={styles.settingItem}>
                            <label>Max Players</label>
                            <span className={styles.settingValue}>6</span>
                        </div>
                        <div className={styles.settingItem}>
                            <label>Starting Coins</label>
                            <span className={styles.settingValue}>2</span>
                        </div>
                        <div className={styles.settingItem}>
                            <label>Turn Timer</label>
                            <span className={styles.settingValue}>60s</span>
                        </div>
                        <div className={styles.settingItem}>
                            <label>Game Mode</label>
                            <span className={styles.settingValue}>Classic</span>
                        </div>
                    </div>
                </div>
            </div>
            <ChatBox header="Lobby Chat" />
        </div>
    )
}

export default Lobby

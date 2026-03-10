import styles from './../styles/PlayRoom.module.css'


function Opponents({ opponents, isChoosing, userId}) {
    return (
        <div className={styles.playersContainer}>
            {opponents.map(player => player.id != userId && (
                <div key={player.id} className={`${styles.player} ${isChoosing ? styles.choosingTarget : ''}`}>
                    <div className={styles.avatarWrapper}>
                        <span className={styles.profilePic}></span>
                        <span className={styles.onlineIndicator}></span>
                    </div>
                    <span className={styles.playerName}>{player.name}</span>
                    <div className={styles.coins}>
                        <span className={styles.coinIcon}></span>
                        <span className={styles.coinValue}>{player.coins}</span>
                    </div>
                    <div className={styles.cardsContainer}>
                        {Array.from({ length: player.numberOfCards }, (_, i) => (
                            <span key={i} className={styles.card}></span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )

}

export default Opponents;

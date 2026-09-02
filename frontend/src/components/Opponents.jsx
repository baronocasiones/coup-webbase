import styles from "./../styles/PlayRoom.module.css";

function Opponents({
    opponents,
    userId,
    setIsChoosingTarget,
    isChoosingTarget = false,
    currentTurnId,
    onPlayerClick
}) {
    const handlePlayerClick = (playerId) => {
        if (isChoosingTarget && onPlayerClick) {
            setIsChoosingTarget(false);
            onPlayerClick(playerId);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className={styles.playersContainer}>
            {opponents.map(
                (player) =>
                    player.id !== userId && (
                        <div
                            key={player.id}
                            className={`${styles.player} ${currentTurnId === player.id ? styles.playerActive : ''} ${isChoosingTarget ? styles.playerTargetable : ''}`}
                            onClick={() => handlePlayerClick(player.id)}
                        >
                            <div className={styles.avatarWrapper}>
                                <span className={styles.profilePic}>
                                    {getInitials(player.name)}
                                </span>
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
                    ),
            )}
        </div>
    );
}

export default Opponents;

import styles from "./../styles/PlayRoom.module.css";
import { gameStates } from "../hooks/useStateMachine"

function Opponents({
    opponents,
    userId,
    setIsChoosingTarget,
    isChoosingTarget = false,
    dispatchGameState
}) {
    const handlePlayerClick = (playerId) => {
        if (isChoosingTarget) {
            setIsChoosingTarget(false);
            dispatchGameState({ type: gameStates.move_declared, payload: { target: playerId } })
        } else {
            return;
        }
    };

    return (
        <div className={styles.playersContainer}>
            {opponents.map(
                (player) =>
                    player.id != userId && (
                        <div
                            key={player.id}
                            className={styles.player}
                            onClick={() => handlePlayerClick(player.id)}
                        >
                            <div className={styles.avatarWrapper}>
                                <span className={styles.profilePic}></span>
                                <span className={styles.onlineIndicator}></span>
                            </div>
                            <span className={styles.playerName}>{player.name}</span>{" "}
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

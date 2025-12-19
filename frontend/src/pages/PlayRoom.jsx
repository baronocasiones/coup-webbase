import styles from './../styles/PlayRoom.module.css'
import PrimaryButton from './../components/PrimaryButton.jsx'
import { useEffect } from 'react'

function PlayRoom() {
    useEffect(() => {
        const previous = document.body.style.backgroundColor

        document.body.style.backgroundColor = '#0F1419'

        return () => {
            document.body.style.backgroundColor = previous
        }
    }, [])

    return (
        <>
            <div className={styles.header}>
                <div className={styles.currentTurnContainer}>
                    <label style={{ color: '#A8B2D1' }}>Current Turn </label>
                    <span style={{ color: '#E94560' }}>Alexandra's Turn</span>
                </div>
                <div className={styles.statsContainer}>
                    <div>
                        <label className={styles.statLabels}>Round </label><br />
                        <span>3</span>
                    </div>
                    <div>
                        <label className={styles.statLabels}>Players Left </label><br />
                        <span>4/4</span>
                    </div>
                    <div>
                        <label className={styles.statLabels}>Treasury </label><br />
                        <span>50</span>
                    </div>
                </div>
                <PrimaryButton text='Menu' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
            </div>
            <div className={styles.mainContainer}>
                <div className={styles.gameContainer}>
                    <div className={styles.playersContainer}>
                        <div className={styles.player}>
                            <span className={styles.profilePic}></span>
                            <span className={styles.playerName}>Marcus</span>
                            <div className={styles.coins}>
                                <span className={styles.coinIcon}></span>
                                <span className={styles.coinValue}>5</span>
                            </div>
                            <div className={styles.cardsContainer}>
                                <span className={styles.card}></span>
                                <span className={styles.card}></span>
                            </div>
                        </div>
                        <div className={styles.player}>
                            <span className={styles.profilePic}></span>
                            <span className={styles.playerName}>Sophia</span>
                            <div className={styles.coins}>
                                <span className={styles.coinIcon}></span>
                                <span className={styles.coinValue}>3</span>
                            </div>
                            <div className={styles.cardsContainer}>
                                <span className={styles.card}></span>
                                <span className={styles.card}></span>
                            </div>
                        </div>
                        <div className={styles.player}>
                            <span className={styles.profilePic}></span>
                            <span className={styles.playerName}>James</span>
                            <div className={styles.coins}>
                                <span className={styles.coinIcon}></span>
                                <span className={styles.coinValue}>7</span>
                            </div>
                            <div className={styles.cardsContainer}>
                                <span className={styles.card}></span>
                                <span className={styles.card}></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div></div>
                <div></div>
            </div>
        </>
    )
}

export default PlayRoom

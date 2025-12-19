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
                    <div className={styles.movePreview}>
                        <h3 style={{ textAlign: 'center' }}>Marcus claims to be the Duke</h3>
                        <span style={{ textAlign: 'center', color: '#A8B2D1' }}>Marcus is taking 3 coins from the treasury. You can challenge this claim or let it pass.</span>
                        <div className={styles.challengeButton}>
                            <PrimaryButton text='Challenge' width='auto' />
                            <PrimaryButton text='Pass' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                        </div>
                    </div>
                    <div className={styles.userUIContainer}>
                        <div className={styles.userInfo}>
                            <div className={styles.userIdentifier}>
                                <span className={styles.profilePic} style={{ backgroundColor: '#E94560', width: '56px', height: '56px' }}></span>
                                <h3 style={{ alignContent: 'center' }}>You (Alexandra)</h3>
                            </div>
                            <div className={styles.userCoins}>
                                <span style={{ width: '28px', height: '28px', borderRadius: '100%', display: 'inline-block', backgroundColor: '#FFD700'}}></span>
                                <span style={{ color: '#FFD700'}}>4</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PlayRoom

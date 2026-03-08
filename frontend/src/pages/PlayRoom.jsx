import styles from './../styles/PlayRoom.module.css'
import PrimaryButton from './../components/PrimaryButton.jsx'
import ChatBox from './../components/ChatBox.jsx'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getGame, getUserPlayer } from '../services/game.js'
import Loader from '../components/Loader.jsx'

function PlayRoom() {
    const userId = sessionStorage.getItem('userId')
    const navigate = useNavigate()
    const gameWs = useRef(null)
    const queryClient = useQueryClient()
    const { data: gameState, isLoading: gameStateIsLoading } = useQuery({
        queryKey: ['gameState'],
        queryFn: getGame,
        onError: (error) => {
            console.error("Error on initial fetching the inital game state: ", error)
            navigate('/lobby')
        }
    })
    const players = gameState?.playersState
    const { data: userPlayer, isLoading: userPlayerIsLoading } = useQuery({
        queryKey: ['gameState', userId],
        queryFn: () => getUserPlayer(userId),
        onError: (error) => {
            console.error(error)
        }
    })

    useEffect(() => {
        const previous = document.body.style.backgroundColor
        document.body.style.backgroundColor = '#0F1419'

        return () => {
            document.body.style.backgroundColor = previous
        }
    }, [])

    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || 'localhost';
        const wsPort = import.meta.env.WS_PORT || '8000';
        gameWs.current = new WebSocket(`ws://${wsHost}:${wsPort}/ws/game?user_id=${userId}`)

        gameWs.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            queryClient.setQueryData(['gameState'], data)
            console.log('Received message:', data)
        }

        gameWs.current.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        return () => {
            if (gameWs.current) {
                gameWs.current.close()
            }
        }
    }, [])

    if (gameStateIsLoading || userPlayerIsLoading) {
        return <Loader />
    }
    if (!userId) {
        navigate('/')
    }

    return (
        <>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.currentTurnContainer}>
                    <label className={styles.turnLabel}>Current Turn</label>
                    <span className={styles.turnName}>Alexandra's Turn</span>
                </div>
                <div className={styles.statsContainer}>
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Round</label>
                        <span className={styles.statValue}>3</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Players Left</label>
                        <span className={styles.statValue}>4 / 4</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Treasury</label>
                        <span className={styles.statValue}>💰 50</span>
                    </div>
                </div>
                <PrimaryButton text='Menu' backgroundColor='rgba(255, 255, 255, 0.08)' width='auto' />
            </div>

            {/* Main content */}
            <div className={styles.mainContainer}>
                <div className={styles.gameContainer}>

                    {/* Opponents */}
                    <div className={styles.playersContainer}>
                        {players.map(player => player.id != userId && (
                            <div key={player.id} className={styles.player}>
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

                </div>

                <ChatBox header="Game Log" withSubmission={false} />
            </div>

            {/* User panel */}
            <div className={styles.userUIContainer}>
                <div className={styles.userInfo}>
                    <div className={styles.userIdentifier}>
                        <div className={styles.userAvatarWrapper}>
                            <span className={styles.profilePic} style={{ backgroundColor: '#E94560', width: '52px', height: '52px' }}></span>
                            <span className={styles.youBadge}>You</span>
                        </div>
                        <div className={styles.userNameBlock}>
                            <h3 className={styles.userName}>{userPlayer.name}</h3>
                            <span className={styles.userStatus}>● Active</span>
                        </div>
                    </div>
                    <div className={styles.userCoins}>
                        <span className={styles.coinIcon} style={{ width: '24px', height: '24px' }}></span>
                        <span className={styles.userCoinValue}>{userPlayer.coins} coins</span>
                    </div>
                </div>

                <div className={styles.userCardsContainer}>
                    <span className={styles.userCard}>
                        <span className={styles.userCardIcon}>🃏</span>
                        <h4 className={styles.userCardName}>{userPlayer.cards[0]}</h4>
                        <label className={styles.userCardAbility}>Take 3 coins</label>
                    </span>
                    <span className={styles.userCard}>
                        <span className={styles.userCardIcon}>🃏</span>
                        <h4 className={styles.userCardName}>{userPlayer.cards[1]}</h4>
                        <label className={styles.userCardAbility}>Pay 3 to eliminate</label>
                    </span>

                    <div className={styles.userMoves}>
                        <p className={styles.movesLabel}>Your Actions</p>
                        <div className={styles.movesRow}>
                            <PrimaryButton text='Income' backgroundColor='rgba(255,255,255,0.07)' width='auto' />
                            <PrimaryButton text='Foreign Aid' backgroundColor='rgba(255,255,255,0.07)' width='auto' />
                            <PrimaryButton text='Coup (7)' width='auto' />
                        </div>
                        <div className={styles.movesRow}>
                            <PrimaryButton text='Tax — Duke' backgroundColor='rgba(102,126,234,0.25)' width='auto' />
                            <PrimaryButton text='Assassinate' backgroundColor='rgba(233,69,96,0.2)' width='auto' />
                            <PrimaryButton text='Steal — Captain' backgroundColor='rgba(102,126,234,0.25)' width='auto' />
                            <PrimaryButton text='Exchange — Ambassador' backgroundColor='rgba(102,126,234,0.25)' width='auto' />
                        </div>
                    </div>
                </div>
                {/* Move preview */}
                <div className={styles.movePreview}>
                    <div className={styles.movePreviewBadge}>Action</div>
                    <h3 className={styles.movePreviewTitle}>Marcus claims to be the Duke</h3>
                    <p className={styles.movePreviewDesc}>
                        Marcus is taking 3 coins from the treasury. You can challenge this claim or let it pass.
                    </p>
                    <div className={styles.challengeButton}>
                        <PrimaryButton text='⚔️ Challenge' width='auto' />
                        <PrimaryButton text='Pass' backgroundColor='rgba(255, 255, 255, 0.08)' width='auto' />
                    </div>
                </div>
            </div>
        </>
    )
}

export default PlayRoom

import styles from './../styles/PlayRoom.module.css'
import PrimaryButton from './../components/PrimaryButton.jsx'
import ChatBox from './../components/ChatBox.jsx'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getGame } from '../services/game.js'
import Loader from '../components/Loader.jsx'
import { getPlayer } from "../utils.js"

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

    // catch if user tries to access playroom without going through
    // lobby or if players data is not available for some reason and redirect
    // them to the appropriate page


    useEffect(() => {
        const previous = document.body.style.backgroundColor
        document.body.style.backgroundColor = '#0F1419'

        return () => {
            document.body.style.backgroundColor = previous
        }
    }, [])

    // useEffect(() => {
    //     const wsHost = import.meta.env.WS_HOST || 'localhost';
    //     const wsPort = import.meta.env.WS_PORT || '8000';
    //     gameWs.current = new WebSocket(`ws://${wsHost}:${wsPort}/ws/game?user_id=${userId}`)
    //
    //     gameWs.current.onmessage = (event) => {
    //         const data = JSON.parse(event.data)
    //         console.log('Received message:', data)
    //     }
    //
    //     gameWs.current.onerror = (error) => {
    //         console.error('WebSocket error:', error)
    //     }
    //
    //     return () => {
    //         if (gameWs.current) {
    //             gameWs.current.close()
    //         }
    //     }
    // }, [])

    if (gameStateIsLoading) {
        return <Loader />
    }
    if (!userId) {
        navigate('/')
    }

    return (
        <>
            <div>
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

                            {players.map(player => player.id != userId && (
                                <div key={player.id} className={styles.player}>
                                    <span className={styles.profilePic}></span>
                                    <span className={styles.playerName}>{player.name}</span>
                                    <div className={styles.coins}>
                                        <span className={styles.coinIcon}></span>
                                        <span className={styles.coinValue}>{player.coins}</span>
                                    </div>
                                    <div className={styles.cardsContainer}>
                                        <span className={styles.card}></span>
                                        <span className={styles.card}></span>
                                    </div>
                                </div>
                            ))}

                        </div>
                        <div className={styles.movePreview}>
                            <h3 style={{ textAlign: 'center' }}>Marcus claims to be the Duke</h3>
                            <span style={{ textAlign: 'center', color: '#A8B2D1' }}>Marcus is taking 3 coins from the treasury. You can challenge this claim or let it pass.</span>
                            <div className={styles.challengeButton}>
                                <PrimaryButton text='Challenge' width='auto' />
                                <PrimaryButton text='Pass' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                            </div>
                        </div>
                    </div>
                    <ChatBox header="Game Log" withSubmission={false} />
                </div>
            </div>
            <div className={styles.userUIContainer}>
                <div className={styles.userInfo}>
                    <div className={styles.userIdentifier}>
                        <span className={styles.profilePic} style={{ backgroundColor: '#E94560', width: '56px', height: '56px' }}></span>
                        <h3 style={{ alignContent: 'center' }}>You (Alexandra)</h3>
                    </div>
                    <div className={styles.userCoins}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '100%', display: 'inline-block', backgroundColor: '#FFD700' }}></span>
                        <span style={{ color: '#FFD700' }}>4</span>
                    </div>
                </div>
                <div className={styles.userCardsContainer}>
                    <span className={styles.userCard}>
                        <h4>DUKE</h4>
                        <label>Take 3 coins</label>
                    </span>
                    <span className={styles.userCard}>
                        <h4>ASSASSIN</h4>
                        <label>Pay 3 to eliminate</label>
                    </span>
                    <div className={styles.userMoves}>
                        <div style={{ display: 'flex', columnGap: '12px', justifyContent: 'center' }}>
                            <PrimaryButton text='Income' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                            <PrimaryButton text='Foreign Aid' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                            <PrimaryButton text='Coup (7)' width='auto' />
                        </div>
                        <div style={{ display: 'flex', columnGap: '12px', justifyContent: 'center' }}>
                            <PrimaryButton text='Tax (Duke)' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                            <PrimaryButton text='Assassinate (Assassin)' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                            <PrimaryButton text='Steal (Captain)' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                            <PrimaryButton text='Exchange (Ambassador)' backgroundColor='rgba(255, 255, 255, 0.098)' width='auto' />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default PlayRoom

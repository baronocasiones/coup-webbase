import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'
import PrimaryButton from './../components/PrimaryButton'
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getPlayers, removePlayer, changeReadyState } from '../services/game'

function Lobby() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()
    const userId = location.state?.userId || null
    const gameWs = useRef(null)
    const chatWs = useRef(null)
    const { data: players, isLoading: isPlayersLoading, isError: isPlayersError } = useQuery({
        queryKey: ['players'],
        queryFn: getPlayers
    })
    const { mutate: removePlayerMutation } = useMutation({
        mutationFn: removePlayer,
        onError: (error) => console.error(error.message),
        onSuccess: () => navigate('/')
    })
    const { mutate: changeReadyStateMutation } = useMutation({
        mutationFn: changeReadyState, 
        onError: (error) => console.error(error.message),
        onSuccess: () => queryClient.invalidateQueries(['players'])
    })

    useEffect(() => {
        gameWs.current = new WebSocket(`ws://localhost:8000/ws/lobby?player_id=${userId}`)

        gameWs.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                queryClient.setQueryData(['players'], data);
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };

        gameWs.current.onclose = () => {
            console.log("WebSocket disconnected")
        }

        gameWs.current.onerror = (error) => {
            console.error("Websocet error:", error)
        }

        return () => {
            if (gameWs.current.readyState === WebSocket.OPEN) {
                gameWs.current.close();
            }
        }

    }, [userId, gameWs, queryClient])

    const handleReady = () => {
        const userPlayer = players.find(player => player.id === userId)
        userPlayer.isReady ? userPlayer.isReady = false : userPlayer.isReady = true
        if(gameWs.current){
            changeReadyStateMutation({playerId: userId, gameWs: gameWs.current, newReadyState: userPlayer.isReady})
        }
    }

    const handleDisconnect = () => {
        if (!userId) return;

        if(gameWs.current){
            removePlayerMutation({playerId: userId, gameWs: gameWs.current})
        }
    }
    if (isPlayersLoading) {
        return <div><h1>Loading...</h1></div>
    }

    if(isPlayersError){
        return <div><h1>Error loading players.</h1></div>
    }

    return (
        <div className={styles.lobbyContainer}>
            <div className={styles.playerListContainer}>
                <h2>Players</h2>
                {players.map((player) => (
                    <div className={styles.player} key={player?.id}>
                        <span className={styles.avatar}></span>
                        <div className={styles.nameContainer}>
                            {userId === player?.id ? <span>{player?.name} (you)</span> : <span>{player?.name}</span>}
                            <span className={styles.playerState}>{player?.isReady ? 'Ready' : 'Not ready'}</span>
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
            <div>
                <ChatBox header="Lobby Chat" />
                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '16px', flexDirection: 'column', rowGap: '1rem' }}>
                    <PrimaryButton text="Ready" width='85%' onClick={handleReady} />
                    <PrimaryButton text="Leave Lobby" width='85%' backgroundColor='rgba(255, 255, 255, 0.098)' onClick={handleDisconnect} />
                </div>
                <label style={{ display: 'flex', justifyContent: 'center', color: '#A8B2D1' }}>Waiting for all players to be ready</label>
            </div>
        </div>
    )
}

export default Lobby

import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'
import PrimaryButton from './../components/PrimaryButton'
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getPlayers, removePlayer, changeReadyState } from '../services/player'
import axios from '../axios'
import Loader from '../components/Loader'

function Lobby() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const userId = sessionStorage.getItem('userId')
    const gameWs = useRef(null)
    const { data: players, isLoading: isPlayersLoading, isError: isPlayersError } = useQuery({
        queryKey: ['players'],
        queryFn: getPlayers,
        refetchOnWindowFocus: false
    })
    const { mutate: removePlayerMutation } = useMutation({
        mutationFn: removePlayer,
        onError: (error) => console.error(error.message),
        onSuccess: () => {
            queryClient.invalidateQueries(['players'])
            queryClient.invalidateQueries(['user'])
            navigate('/')
        }
    })
    const { mutate: changeReadyStateMutation } = useMutation({
        mutationFn: changeReadyState,
        onError: (error) => console.error(error.message),
        onSuccess: () => queryClient.invalidateQueries(['players'])
    })
    const isHost = players?.[0]?.id === userId
    const allReady = Array.isArray(players) && players?.every(player => player.isReady)
    const canStartGame = isHost && allReady && players?.length >= 2


    useEffect(() => {
        if (!isPlayersLoading && !userId) {
            navigate('/')
        }
        const handleDisconnect = (event) => {
            event.preventDefault();
            if (gameWs.current) {
                gameWs.current.close()
            }
            removePlayerMutation({ playerId: userId, gameWs: gameWs.current })
            sessionStorage.clear()
        }

        window.addEventListener('beforehand', handleDisconnect)
        return () => {
            window.removeEventListener('beforhand', handleDisconnect)
        }
    }, [])

    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || 'localhost';
        const wsPort = import.meta.env.WS_PORT || '8000';
        gameWs.current = new WebSocket(`ws://${wsHost}:${wsPort}/ws/lobby?user_id=${userId}`)

        gameWs.current.onmessage = (event) => {
            try {
                if(!event.data.action){
                    const players = JSON.parse(event.data).players;
                    console.log(players)
                    const action = JSON.parse(event.data).action
                    queryClient.setQueryData(['players'], players);
                    if(action === 'start-game'){
                        navigate('/playroom')
                    }
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };

        gameWs.current.onclose = () => {
            console.log("WebSocket disconnected")
        }

        gameWs.current.onerror = (error) => {
            console.error("WebSocket error:", error)
            navigate('/')
        }

        return () => {
            if (gameWs.current && gameWs.current.readyState === WebSocket.OPEN) {
                gameWs.current.close();
            }
        }

    }, [userId, queryClient, isPlayersLoading])

    const handleReady = () => {
        const userPlayer = players.find(player => player.id === userId)
        userPlayer.isReady ? userPlayer.isReady = false : userPlayer.isReady = true
        if (gameWs.current) {
            changeReadyStateMutation({ playerId: userId, gameWs: gameWs.current, newReadyState: userPlayer.isReady })
        }
    }

    const handleStartGame = async () => {
        const response = await axios.get('/start-game')
        if(response.status === 200){
            navigate('/playroom')
            gameWs.current.send(JSON.stringify({ action: 'start-game' }))
        }
    }

    const handleDisconnect = () => {
        if (!userId) return;

        if (gameWs.current) {
            removePlayerMutation({ playerId: userId, gameWs: gameWs.current })
        }
    }
    if (isPlayersLoading) {
        return <Loader/>
    }

    if (isPlayersError) {
        setTimeout(() => navigate('/'), 3000)
        return <div><h1>Error loading players.</h1></div>
    }

    return (
        <div className={styles.lobbyContainer}>
            <div className={styles.playerListContainer}>
                <h2>Players</h2>
                <div style={{ height: '269px', overflowY: 'scroll' }}>
                    {players.map((player) => (
                        <div className={styles.player} key={player?.id}>
                            <span className={styles.avatar}></span>
                            <div className={styles.nameContainer}>
                                {userId === player?.id ? <span>{player?.name} (you)</span> : <span>{player?.name}</span>}
                                <span className={styles.playerState}>{player?.isReady ? 'Ready' : 'Not ready'}</span>
                            </div>
                        </div>
                    ))}
                </div>
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
                <div style={{ paddingTop: '1rem', display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '16px', flexDirection: 'column', rowGap: '1rem' }}>
                    {
                        canStartGame ? 
                        <PrimaryButton text="Start Game" width='85%' onClick={handleStartGame} /> :
                        <PrimaryButton text="Ready" width='85%' onClick={handleReady} />
                    }
                    <PrimaryButton text="Leave Lobby" width='85%' backgroundColor='rgba(255, 255, 255, 0.098)' onClick={handleDisconnect} />
                </div>
                <label style={{ display: 'flex', justifyContent: 'center', color: '#A8B2D1' }}>Waiting for all players to be ready</label>
            </div>
        </div>
    )
}

export default Lobby

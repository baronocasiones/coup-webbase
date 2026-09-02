import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'
import PrimaryButton from './../components/PrimaryButton'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getPlayers, removePlayer, changeReadyState } from '../services/player'
import axios from '../axios'
import Loader from '../components/Loader'

const MAX_PLAYERS = 6

/**
 * Lobby component — the waiting room before a game starts.
 * Displays the list of connected players, game settings, a chat box,
 * and action buttons (Ready / Start Game / Leave Lobby).
 */
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

        window.addEventListener('beforeunload', handleDisconnect)
        return () => {
            window.removeEventListener('beforeunload', handleDisconnect)
        }
    }, [userId, isPlayersLoading, navigate])

    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || 'localhost';
        const wsPort = import.meta.env.WS_PORT || '8000';
        gameWs.current = new WebSocket(`ws://${wsHost}:${wsPort}/ws/lobby?user_id=${userId}`)

        gameWs.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                const playersData = data.players
                const action = data.action
                if (playersData) {
                    queryClient.setQueryData(['players'], playersData)
                }
                if (action === 'start-game') {
                    navigate('/playroom')
                }
            } catch (err) {
                console.error("Failed to parse WebSocket message:", err);
            }
        };

        gameWs.current.onclose = () => {
            console.log("WebSocket disconnected")
        }

        gameWs.current.onerror = () => {
            navigate('/')
        }

        return () => {
            if (gameWs.current && gameWs.current.readyState === WebSocket.OPEN) {
                gameWs.current.close();
            }
        }
    }, [userId, queryClient, isPlayersLoading, navigate])

    const handleReady = () => {
        const userPlayer = players.find(player => player.id === userId)
        if (!userPlayer) return
        const newReadyState = !userPlayer.isReady
        if (gameWs.current) {
            changeReadyStateMutation({ playerId: userId, gameWs: gameWs.current, newReadyState })
        }
    }

    const handleStartGame = async () => {
        const response = await axios.get('/start-game')
        if (response.status === 200) {
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
        return <Loader />
    }

    if (isPlayersError) {
        setTimeout(() => navigate('/'), 3000)
        return <div><h1>Error loading players.</h1></div>
    }

    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    const emptySlots = Math.max(0, MAX_PLAYERS - (players?.length || 0))

    return (
        <div className={styles.lobbyContainer}>
            {/* Left panel: player list and game settings */}
            <div className={styles.playerListContainer}>
                <h2 className={styles.panelTitle}>Players</h2>
                <div className={styles.playerList}>
                    {players && players.map((player) => (
                        <div className={styles.player} key={player?.id}>
                            <div className={styles.avatar}>
                                {getInitials(player?.name)}
                            </div>
                            <div className={styles.nameContainer}>
                                <span className={`${styles.playerName} ${userId === player?.id ? styles.playerNameSelf : ''}`}>
                                    {player?.name} {userId === player?.id && '(you)'}
                                </span>
                                <span className={`${styles.playerState} ${player?.isReady ? styles.playerStateReady : styles.playerStateNotReady}`}>
                                    {player?.isReady ? 'Ready' : 'Not ready'}
                                </span>
                            </div>
                            {players[0]?.id === player?.id && (
                                <span className={styles.hostBadge}>Host</span>
                            )}
                        </div>
                    ))}
                    {Array.from({ length: emptySlots }).map((_, i) => (
                        <div className={styles.emptySlot} key={`empty-${i}`}>
                            <div className={styles.emptySlotAvatar} />
                            <span className={styles.emptySlotText}>Waiting for player...</span>
                        </div>
                    ))}
                </div>
                <div className={styles.gameSettings}>
                    <h3 className={styles.gameSettingsTitle}>Game Settings</h3>
                    <div className={styles.settingContainer}>
                        <div className={styles.settingItem}>
                            <span className={styles.settingLabel}>Max Players</span>
                            <span className={styles.settingValue}>6</span>
                        </div>
                        <div className={styles.settingItem}>
                            <span className={styles.settingLabel}>Starting Coins</span>
                            <span className={styles.settingValue}>2</span>
                        </div>
                        <div className={styles.settingItem}>
                            <span className={styles.settingLabel}>Game Mode</span>
                            <span className={styles.settingValue}>Classic</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel: chat box, action buttons, and status label */}
            <div className={styles.rightPanel}>
                <ChatBox header="Lobby Chat" />
                <div className={styles.actionsContainer}>
                    {
                        canStartGame ?
                            <PrimaryButton text="Start Game" width="100%" onClick={handleStartGame} /> :
                            <PrimaryButton text="Ready" width="100%" onClick={handleReady} />
                    }
                    <PrimaryButton text="Leave Lobby" width="100%" variant="secondary" onClick={handleDisconnect} />
                </div>
                <span className={styles.statusLabel}>Waiting for all players to be ready</span>
            </div>
        </div>
    )
}

export default Lobby

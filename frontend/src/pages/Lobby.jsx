import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'
import PrimaryButton from './../components/PrimaryButton'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getPlayers, removePlayer, changeReadyState } from '../services/player'
import axios from '../axios'
import Loader from '../components/Loader'

/**
 * Lobby component — the waiting room before a game starts.
 * Displays the list of connected players, game settings, a chat box,
 * and action buttons (Ready / Start Game / Leave Lobby).
 *
 * Manages a WebSocket connection to receive real-time player updates
 * and game start signals from the server.
 */
function Lobby() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    /** The current user's ID, stored in session storage on login/join. */
    const userId = sessionStorage.getItem('userId')
    /** Ref holding the WebSocket connection for the lobby. */
    const gameWs = useRef(null)

    /**
     * Fetches the list of players currently in the lobby.
     * Disables refetch on window focus to avoid unnecessary requests
     * while the WebSocket keeps the data in sync.
     */
    const { data: players, isLoading: isPlayersLoading, isError: isPlayersError } = useQuery({
        queryKey: ['players'],
        queryFn: getPlayers,
        refetchOnWindowFocus: false
    })

    /**
     * Mutation to remove a player from the lobby.
     * On success, invalidates the players and user caches, then navigates home.
     */
    const { mutate: removePlayerMutation } = useMutation({
        mutationFn: removePlayer,
        onError: (error) => console.error(error.message),
        onSuccess: () => {
            queryClient.invalidateQueries(['players'])
            queryClient.invalidateQueries(['user'])
            navigate('/')
        }
    })

    /**
     * Mutation to toggle a player's ready state.
     * On success, invalidates the players cache to reflect the change.
     */
    const { mutate: changeReadyStateMutation } = useMutation({
        mutationFn: changeReadyState,
        onError: (error) => console.error(error.message),
        onSuccess: () => queryClient.invalidateQueries(['players'])
    })

    /** Whether the current user is the host (first player in the list). */
    const isHost = players?.[0]?.id === userId
    /** Whether every player in the lobby has marked themselves as ready. */
    const allReady = Array.isArray(players) && players?.every(player => player.isReady)
    /** The game can only start if the current user is the host, all players are ready, and there are at least 2 players. */
    const canStartGame = isHost && allReady && players?.length >= 2


    /**
     * Handles cleanup when the user navigates away or closes the tab.
     * Closes the WebSocket, removes the player from the lobby, and clears session storage.
     *
     * NOTE: The event names 'beforehand' / 'beforhand' appear to be typos —
     * they should likely be 'beforeunload'.
     */
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

    /**
     * Establishes the WebSocket connection to the lobby channel.
     *
     * - On message: parses the incoming JSON to update the player list via
     *   queryClient.setQueryData and navigates to the playroom if a
     *   'start-game' action is received.
     * - On close: logs a disconnect message.
     * - On error: logs the error and navigates the user back home.
     *
     * Cleans up by closing the socket when the component unmounts or
     * dependencies change.
     */
    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || 'localhost';
        const wsPort = import.meta.env.WS_PORT || '8000';
        gameWs.current = new WebSocket(`ws://${wsHost}:${wsPort}/ws/lobby?user_id=${userId}`)

        gameWs.current.onmessage = (event) => {
            try {
                if(!event.data.action){
                    const data = JSON.parse(event.data)
                    const playersData = data.players
                    const action = data.action
                    queryClient.setQueryData(['players'], playersData)
                    if(action === 'start-game'){
                        navigate('/playroom', { state: { players }})
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
            navigate('/')
        }

        return () => {
            if (gameWs.current && gameWs.current.readyState === WebSocket.OPEN) {
                gameWs.current.close();
            }
        }

    }, [userId, queryClient, isPlayersLoading])

    /**
     * Toggles the current user's ready state and sends the update
     * through the WebSocket via the changeReadyState mutation.
     */
    const handleReady = () => {
        const userPlayer = players.find(player => player.id === userId)
        !userPlayer.isReady
        if (gameWs.current) {
            changeReadyStateMutation({ playerId: userId, gameWs: gameWs.current, newReadyState: userPlayer.isReady })
        }
    }

    /**
     * Initiates the game by calling the /start-game endpoint.
     * On success, navigates to the playroom and broadcasts a
     * 'start-game' action over the WebSocket so other clients follow.
     */
    const handleStartGame = async () => {
        const response = await axios.get('/start-game')
        if(response.status === 200){
            navigate('/playroom')
            gameWs.current.send(JSON.stringify({ action: 'start-game' }))
        }
    }

    /**
     * Handles the "Leave Lobby" button click.
     * Removes the player from the lobby via the mutation, which also
     * closes the WebSocket and navigates home on success.
     */
    const handleDisconnect = () => {
        if (!userId) return;

        if (gameWs.current) {
            removePlayerMutation({ playerId: userId, gameWs: gameWs.current })
        }
    }

    /* Show a loading spinner while the player list is being fetched. */
    if (isPlayersLoading) {
        return <Loader/>
    }

    /* On fetch error, display an error message and redirect home after 3 seconds. */
    if (isPlayersError) {
        setTimeout(() => navigate('/'), 3000)
        return <div><h1>Error loading players.</h1></div>
    }

    return (
        <div className={styles.lobbyContainer}>
            {/* Left panel: player list and game settings */}
            <div className={styles.playerListContainer}>
                <h2>Players</h2>
                <div style={{ height: '269px', overflowY: 'scroll' }}>
                    {players && players.map((player) => (
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
            {/* Right panel: chat box, action buttons, and status label */}
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

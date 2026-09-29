import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'
import PrimaryButton from './../components/PrimaryButton'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getPlayers, removePlayer, changeReadyState } from '../services/player'
import axios from '../axios'
import Loader from '../components/Loader'
import { buildWsUrl } from '../utils/ws'
import { animate, createTimeline, stagger } from 'animejs'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, STAGGER, selAll } from '../utils/motion'

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

    // Row elements by player id, plus snapshots of the state we animate
    // *transitions* of. The lobby is a waiting room: the interesting moments
    // are not the first paint, they are the seat filling up and people
    // tapping themselves ready.
    const rowRefs = useRef({})
    const previousReady = useRef({})
    const previousCount = useRef(0)

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

    /**
     * Opening beat. The two panels slide in from their own sides, which reads
     * as the table being laid out rather than content being dumped on screen,
     * then the seats fill in top to bottom.
     */
    const [rootRef, , play] = useAnimeScope((root) => {
        const tl = createTimeline({ defaults: { ease: EASE.entrance } })

        tl.add(selAll(root, styles.playerListContainer), {
            opacity: { from: 0 },
            translateX: { from: -20 },
            duration: DURATION.slow,
        })
            .add(selAll(root, styles.rightPanel), {
                opacity: { from: 0 },
                translateX: { from: 20 },
                duration: DURATION.slow,
            }, 0)
            .add(selAll(root, styles.player), {
                opacity: { from: 0 },
                translateY: { from: 10 },
                duration: DURATION.normal,
                delay: stagger(STAGGER.list),
            }, '+=120')
            // Empty seats fade in as ghosts rather than flying in — they are
            // absence, not arrival, and should not compete for attention.
            .add(selAll(root, styles.emptySlot), {
                opacity: { from: 0 },
                duration: DURATION.normal,
                delay: stagger(30),
            }, '+=160')
        // Both panels only render once the player query resolves; before that
        // this page is a <Loader /> with no root to animate inside, so the
        // loading flag has to be a dependency for the entrance to ever run.
    }, [isPlayersLoading])

    /**
     * Someone took a seat. Only the new row animates — the existing table
     * should not replay its entrance because the room got fuller.
     */
    useEffect(() => {
        if (!Array.isArray(players) || players.length === 0) return

        const count = players.length
        const grew = previousCount.current !== 0 && count > previousCount.current
        previousCount.current = count
        if (!grew) return

        const row = rowRefs.current[players[count - 1].id]
        if (!row) return

        play(() =>
            animate(row, {
                opacity: [{ from: 0 }, { to: 1 }],
                translateX: [{ from: -16 }, { to: 0 }],
                duration: DURATION.normal,
                ease: EASE.entrance,
            })
        )
    }, [players, play])

    /**
     * A player flipped to ready. A single bright pulse on that row — enough to
     * be noticed across a room, not enough to be the loudest thing on screen.
     * Filter brightness is used rather than a colour so it stays correct
     * against the gold and neutral row treatments alike (and because
     * brightening moves text further from the contrast threshold, not closer).
     *
     * Only fires on becoming ready, not on un-readying — a row dropping back
     * out of ready should not get the same celebratory brightening.
     */
    useEffect(() => {
        if (!Array.isArray(players)) return

        players.forEach((player) => {
            const was = previousReady.current[player.id]
            previousReady.current[player.id] = player.isReady

            if (was === undefined || was === true || !player.isReady) return

            const row = rowRefs.current[player.id]
            if (!row) return

            play(() =>
                animate(row, {
                    filter: [{ to: 'brightness(1.35)' }, { to: 'brightness(1)' }],
                    scale: [{ to: 1.02 }, { to: 1 }],
                    duration: DURATION.slow,
                    ease: EASE.entrance,
                })
            )
        })
    }, [players, play])

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
        gameWs.current = new WebSocket(buildWsUrl('/ws/lobby', userId))

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
        <div className={styles.lobbyContainer} ref={rootRef}>
            {/* Left panel: player list and game settings */}
            <div className={styles.playerListContainer}>
                <h2 className={styles.panelTitle}>Players</h2>
                <div
                    className={styles.playerList}
                    /*
                     * Joins and ready-ups land over the lobby WebSocket. The
                     * entrance and the ready pulse are the visual channel for
                     * those events; this is the equivalent for anyone who
                     * cannot use them.
                     */
                    role="log"
                    aria-live="polite"
                    aria-relevant="additions"
                >
                    {players && players.map((player) => (
                        <div
                            className={styles.player}
                            key={player?.id}
                            ref={(el) => { rowRefs.current[player?.id] = el }}
                        >
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
                {/*
                 * The "Game Settings" panel that used to sit here listed Max
                 * Players 6 / Starting Coins 2 / Game Mode Classic — three
                 * hardcoded constants, presented as if they were configurable.
                 * It occupied ~200px of the panel and implied a settings screen
                 * that does not exist. Removed; the reclaimed space goes to the
                 * player list, which was clipping real players.
                 */}
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

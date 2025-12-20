import styles from './../styles/Lobby.module.css'
import ChatBox from './../components/ChatBox'
import PrimaryButton from './../components/PrimaryButton'
import { useEffect, useState } from 'react'
import axios from '../axios'
import { useLocation, useNavigate } from 'react-router-dom'

function Lobby() {
    const navigate = useNavigate()
    const location = useLocation()
    const [players, setPlayers] = useState([])
    const userId = location.state?.userId

    useEffect(() => {
        axios.get('/players').then(response => {
            setPlayers(response.data)
        })
    }, [])

    const handleReady = () => {
        const userPlayer = players.find(player => player.id === userId)
        const userPlayerIndex = players.indexOf(userPlayer)
        userPlayer.ready ? userPlayer.ready = false : userPlayer.ready = true
        const updatedPlayers = [...players]
        updatedPlayers[userPlayerIndex] = userPlayer
        setPlayers(updatedPlayers)
    }

    const handleDisconnect = () => {
        if (!userId) return; 

        axios.delete('/player', { params: { user_id: userId }}).then(response => {
            setPlayers(response.data)
            navigate('/');
        }).catch(error => {
            console.error('Error disconnecting player:', error.message)
        })

    }

    useEffect(() => {
        console.log(players) 
    }, [players])

    return (
        <div className={styles.lobbyContainer}>
            <div className={styles.playerListContainer}>
                <h2>Players</h2>
                {players.map((player) => (
                    <div className={styles.player} key={player?.id}>
                        <span className={styles.avatar}></span>
                        <div className={styles.nameContainer}>
                            <span>{player?.name}</span>
                            <span className={styles.playerState}>{player?.ready ? 'Ready' : 'Not ready'}</span>
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

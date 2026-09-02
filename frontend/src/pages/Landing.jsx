import styles from '../styles/Landing.module.css'
import PrimaryButton from '../components/PrimaryButton'
import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../axios'
import { useMutation } from '@tanstack/react-query'

function Landing() {
    const navigate = useNavigate()
    const username = useRef()
    const { mutate: addPlayer } = useMutation({
        mutationFn: (username) => axios.post('/player', null, { params: { player_name: username } }),
        onError: (error) => console.error(error.message),
        onSuccess: (response) => {
            sessionStorage.setItem('userId', response.data.id)
            sessionStorage.setItem('username', response.data.name)
            navigate('/lobby', { state: { userId: response.data.id } })
        }
    })

    useEffect(() => {
        sessionStorage.clear()
    }, [])

    return (
        <div className={styles.loginContainer}>
            <h1 className={styles.title}>Coup</h1>
            <p className={styles.subtitle}>The Game of Deception</p>
            <form className={styles.loginForm} onSubmit={(e) => {
                e.preventDefault()
                if (username.current.value.trim()) {
                    addPlayer(username.current.value)
                }
            }}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Your Name</label>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Enter your name to join"
                        ref={username}
                    />
                </div>
                <PrimaryButton text="Join Game" width="100%" />
            </form>
            <p className={styles.footer}>2-6 players &middot; Bluff &middot; Betray &middot; Survive</p>
        </div>
    )
}

export default Landing

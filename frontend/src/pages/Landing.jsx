import styles from '../styles/Landing.module.css'
import PrimaryButton from '../components/PrimaryButton'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function Landing() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const { mutate: addPlayer } = useMutation({
        mutationFn: (username) => axios.post('/player', null, { params: { player_name: username } }),
        onError: (error) => console.error(error.message),
        onSuccess: (response) => {
            const player = response.data
            queryClient.setQueryData(['userId'], player.id)
            queryClient.setQueryData(['username'], player.name)
            navigate('/lobby')
        }
    })



    return (
        <>
            <h1>
                Coup
            </h1>
            <div className={styles.loginContainer}>
                <h1>Welcome To Coup</h1>
                <form className={styles.loginForm} onSubmit={async (e) => {
                    e.preventDefault()
                    if (username.trim()) {
                        addPlayer(username)
                    }
                }}>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <PrimaryButton
                        styles={styles.PrimaryButton}
                        text='Continue To Game'
                    />
                </form>
            </div>
        </>
    );
}

export default Landing

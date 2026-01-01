import styles from '../styles/Landing.module.css'
import PrimaryButton from '../components/PrimaryButton'
import { useRef } from 'react'
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



    return (
        <>
            <h1>
                Coup
            </h1>
            <div className={styles.loginContainer}>
                <h1>Welcome To Coup</h1>
                <form className={styles.loginForm} onSubmit={(e) => {
                    e.preventDefault()
                    if (username.current.value.trim()) {
                        addPlayer(username.current.value)
                    }
                }}>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        ref={username}
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

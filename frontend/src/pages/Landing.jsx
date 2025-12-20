import styles from '../styles/Landing.module.css'
import PrimaryButton from '../components/PrimaryButton'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../axios'

function Landing() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')


    return (
        <>
            <h1>
                Coup
            </h1>
            <div className={styles.loginContainer}>
                <h1>Welcome To Coup</h1>
                <form className={styles.loginForm} onSubmit={(e) => {
                    e.preventDefault()
                    if (username.trim()){
                        axios.post('/player', null, { params: { name: username.trim() }}).then(response => {
                            navigate('/lobby', { state: { userId: response.data.id}})
                        }).catch(error => {
                            console.error('Error creating player:', error.message)
                        })
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

import styles from '../styles/Landing.module.css'
import PrimaryButton from '../components/PrimaryButton'
import { useState } from 'react'

function Landing() {
    const [username, setUsername] = useState('')

    return (
        <div className={styles.loginContainer}>
            <h1>Welcome To Coup</h1>
            <form className={styles.loginForm}>
                <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <PrimaryButton styles={styles.PrimaryButton} text='Continue To Game' />
            </form>
        </div>
    );
}

export default Landing

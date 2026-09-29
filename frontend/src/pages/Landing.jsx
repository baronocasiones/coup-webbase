import styles from '../styles/Landing.module.css'
import PrimaryButton from '../components/PrimaryButton'
import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../axios'
import { useMutation } from '@tanstack/react-query'
import { initDiscord, getDiscordUser, isDiscordConfigured } from '../discord'
import Loader from '../components/Loader'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { createTimeline } from 'animejs'
import { DURATION, EASE, selAll } from '../utils/motion'

function Landing() {
    const navigate = useNavigate()
    const username = useRef()
    // Gate on whether the Discord handshake is actually possible, not on
    // whether it has finished. When no client id is configured — standalone
    // play, and every test — there is nothing to wait for, so the form renders
    // immediately instead of flashing a loader for one microtask.
    const [isDiscordLoading, setIsDiscordLoading] = useState(isDiscordConfigured)

    /**
     * Staged entrance. The wordmark settles first and takes the longest — it
     * is the thing the page is selling — then the promise, then the form, then
     * the supporting line. Sequential rather than simultaneous so the eye is
     * led down the page instead of being handed everything at once.
     *
     * The title resolves out of a blur and settles back from 0.96, which reads
     * as coming into focus. Deliberately not animating `letter-spacing`: it
     * would look good, but it reflows the heading on every frame of the tween,
     * and this is the first thing every player sees. An opacity/scale/filter
     * settle costs nothing in layout.
     */
    const [rootRef] = useAnimeScope((root) => {
        const tl = createTimeline({ defaults: { ease: EASE.entrance } })

        tl.add(selAll(root, styles.title), {
            opacity: { from: 0 },
            scale: { from: 0.94 },
            filter: ['blur(12px)', 'blur(0px)'],
            duration: DURATION.slow,
        })
            .add(selAll(root, styles.subtitle), {
                opacity: { from: 0 },
                translateY: { from: 10 },
                duration: DURATION.normal,
            }, '+=160')
            .add(selAll(root, styles.formGroup), {
                opacity: { from: 0 },
                translateY: { from: 14 },
                duration: DURATION.normal,
            }, '+=120')
            .add(root.querySelectorAll(`.${styles.loginForm} button`), {
                opacity: { from: 0 },
                translateY: { from: 10 },
                scale: { from: 0.97 },
                duration: DURATION.normal,
            }, '+=60')
            .add(selAll(root, styles.footer), {
                opacity: { from: 0 },
                translateY: { from: 8 },
                duration: DURATION.normal,
            }, '+=80')
        // The form only exists once the Discord handshake resolves — until then
        // this page renders <Loader /> and there is no root to animate inside.
        // Keying on that flip is what lets the entrance actually play.
    }, [isDiscordLoading])

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

        // Try to initialize Discord SDK
        async function setupDiscord() {
            try {
                const discordUser = await initDiscord()
                if (discordUser) {
                    // Running inside Discord — auto-create player with Discord identity
                    sessionStorage.setItem('userId', discordUser.id)
                    sessionStorage.setItem('username', discordUser.username)
                    // Create player on backend, then navigate
                    addPlayer(discordUser.username)
                    return
                }
            } catch (err) {
                // Not in Discord or SDK init failed — fall through to manual input
            }
            setIsDiscordLoading(false)
        }
        setupDiscord()
    }, [])

    // Show loader while checking Discord status
    if (isDiscordLoading) {
        return <Loader />
    }

    return (
        <div className={styles.loginContainer} ref={rootRef}>
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

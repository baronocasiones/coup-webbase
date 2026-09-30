import styles from '../styles/Toast.module.css'
import { animate } from 'animejs'
import { useEffect } from 'react'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, TOAST_DISMISS_MS, prefersReducedMotion, selAll } from '../utils/motion'

/**
 * Toast — a transient message that reports something the player did not
 * already know.
 *
 * Built to the Toast Notifications section of `DESIGN.md`: bottom-right, an
 * elevated surface, a 3px left border that carries the type, and a three-second
 * auto-dismiss. That spec was written when a Toast component existed; the
 * component was removed in the 2026-09-03 dead-code cleanup because nothing
 * rendered one. It has a consumer now.
 *
 * It exists because of how failures used to read. Every WebSocket handler
 * answers a rejected action with `{"error": "..."}`, and the client wrote that
 * to the console and nothing else — so a player acting on a wrong assumption saw
 * a button that silently did nothing. The influence-selection bug is the worst
 * case: the picker was shown to the wrong player, every selection was refused,
 * and the table sat in a dead state with no visible sign that anything had
 * happened at all.
 *
 * A toast reports; it never blocks. Nothing here gates a decision, and the
 * message is in the DOM for a screen reader either way, so a missed toast costs
 * a sighted player a glance and costs a screen-reader user nothing at all.
 */
function Toast({ message, tone = 'error', noticeKey, onDismiss }) {
    /*
     * `noticeKey` is what lets the *same* message show twice in a row — a
     * player who taps a refused button twice deserves to see the refusal twice.
     * Keying the animation on the text alone would swallow the second one,
     * because the deps would not have changed.
     */
    const visible = Boolean(message)

    const [rootRef] = useAnimeScope((root) => {
        if (!visible) return
        animate(selAll(root, styles.toast), {
            opacity: { from: 0 },
            translateX: { from: 16 },
            duration: prefersReducedMotion() ? 0 : DURATION.fast,
            ease: EASE.entrance,
        })
    }, [visible, message, tone, noticeKey])

    useEffect(() => {
        if (!visible) return
        // `onDismiss` is deliberately not a dependency. Including it would
        // restart the countdown every time the parent re-renders and hands over
        // a fresh closure, and the toast would never leave. Pinned by a test
        // that re-renders mid-countdown and asserts it still fires on time.
        const timer = setTimeout(() => onDismiss?.(), TOAST_DISMISS_MS)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, message, tone, noticeKey])

    if (!visible) return null

    return (
        <div
            ref={rootRef}
            className={`${styles.toast} ${styles[tone] ?? ''}`}
            /*
             * `assertive`: this reports a refused action, and the alternative is
             * that nothing happens at all with no explanation. It is short-lived
             * and does not interrupt, so it is the right level for a transient
             * consequence rather than a live decision.
             */
            role="alert"
            aria-live="assertive"
            data-tone={tone}
        >
            {message}
        </div>
    )
}

export default Toast

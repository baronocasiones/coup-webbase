import { createTimeline } from 'animejs'
import styles from './../styles/PlayRoom.module.css'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, EASE, selAll } from '../utils/motion'

/**
 * Modal — the target-selection overlay used by Coup, Assassinate and Steal.
 *
 * Always mounted; `style.visibility` toggles it. That detail used to cost this
 * component its entrance animation: the panel's CSS keyframe fired once on mount
 * and finished long before anyone could see it, so every subsequent open just
 * snapped into place. Driving the entrance from an effect keyed on `isVisible`
 * means it replays every time, which is also when it actually does its job —
 * telling you that a targeting mode is now live.
 *
 * Closing is deliberately instant. You dismiss this by picking a target, and
 * making that pick wait on a fade-out would put animation latency between the
 * click and the action.
 */
function Modal({ children, status, style }) {
    const isVisible = style?.visibility === 'visible'

    // The backdrop is hidden on first paint, so there is nothing to animate
    // until the player actually opens the picker. `isVisible` in the deps is
    // what replays the entrance every time — the bug this replaces was a
    // one-shot CSS keyframe that fired on mount, long before anyone could see.
    const [rootRef] = useAnimeScope((root) => {
        if (!isVisible) return

        const tl = createTimeline({ defaults: { ease: EASE.entrance } })

        tl.add(selAll(root, styles.modalBackdrop), {
            opacity: { from: 0 },
            duration: DURATION.fast,
        })
            .add(selAll(root, styles.movePreview), {
                opacity: { from: 0 },
                scale: { from: 0.94 },
                translateY: { from: 16 },
                duration: DURATION.normal,
            }, '+=40')
            // The badge lands a beat after the panel, so the mode label reads
            // as a caption on the picker rather than as page furniture.
            .add(selAll(root, styles.movePreviewBadge), {
                opacity: { from: 0 },
                scale: { from: 0.8 },
                translateY: { from: -6 },
                duration: DURATION.fast,
            }, '+=110')
    }, [isVisible])

    return (
        <div
            className={styles.modalBackdrop}
            ref={rootRef}
            // `visibility` and hit-testing stay with React; anime.js owns
            // opacity and transform. Keeping them on separate properties is
            // what stops the two systems from fighting.
            style={{
                visibility: isVisible ? 'visible' : 'hidden',
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
        >
            <div className={styles.movePreview}>
                <div className={styles.movePreviewBadge}>{status}</div>
                {children}
            </div>
        </div>
    )
}

export default Modal

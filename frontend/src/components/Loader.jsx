import { animate, stagger } from 'animejs'
import styles from '../styles/Loader.module.css'
import { useAnimeScope } from '../hooks/useAnimeScope'
import { DURATION, selAll } from '../utils/motion'

/** Cadence for one dot's full hop, and the gap between the three of them. */
const HOP = DURATION.slow
const OFFSET = 130

/**
 * Loader — three gold counters bouncing over their own shadows.
 *
 * Driven entirely by anime.js. The previous implementation used CSS keyframes
 * animating `top` and `height`, which forces a layout pass on every frame of a
 * loop that stays on screen for the whole lobby handshake. Here the motion is
 * `translate` / `scale` only — all composited, no layout, no reflow.
 */
const Loader = () => {
    const [rootRef] = useAnimeScope((root) => {
        // Hop: rise decelerating, fall accelerating, with the dot squashing
        // flat and widening as it lands, stretching back as it leaves.
        animate(selAll(root, styles.circle), {
            translateY: [{ to: 32, ease: 'out(2)' }, { to: 0, ease: 'in(2)' }],
            scaleY: [{ to: 0.3, ease: 'out(3)' }, { to: 1, ease: 'in(3)' }],
            scaleX: [{ to: 1.6, ease: 'out(3)' }, { to: 1, ease: 'in(3)' }],
            duration: HOP,
            loop: true,
            delay: stagger(OFFSET),
        })

        // Shadows use the same offset, so the loop reads as one object bouncing
        // rather than two animations that happen to coincide.
        animate(selAll(root, styles.shadow), {
            scaleX: [{ to: 1.5, ease: 'out(3)' }, { to: 1, ease: 'in(3)' }],
            opacity: [{ to: 0.35, ease: 'out(3)' }, { to: 0.7, ease: 'in(3)' }],
            duration: HOP,
            loop: true,
            delay: stagger(OFFSET),
        })
    })

    return (
        <div className={styles.container} ref={rootRef}>
            {/*
             * Visually hidden, but announced. The loader is a full-viewport
             * takeover shown during the Discord handshake, every lobby load and
             * every game-state fetch, and it previously said nothing at all.
             * The dots are decorative and are hidden from assistive tech so
             * only this text is read.
             */}
            <p className="srOnly" role="status">
                Loading&hellip;
            </p>
            <div className={styles.wrapper} aria-hidden="true">
                <div className={styles.circle} />
                <div className={styles.circle} />
                <div className={styles.circle} />
                <div className={styles.shadow} />
                <div className={styles.shadow} />
                <div className={styles.shadow} />
            </div>
        </div>
    )
}

export default Loader

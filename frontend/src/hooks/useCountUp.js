import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { prefersReducedMotion, DURATION, EASE } from '../utils/motion'

/**
 * Tween a number toward `value` instead of snapping to it.
 *
 * Coins are the game's whole feedback loop — in Coup, watching someone's pile
 * climb is the primary signal that your bluff landed. Snapping the number makes
 * that invisible: 4 -> 5 and 4 -> 40 look identical for a frame. Tweening it
 * turns the change into something the eye can catch across the table.
 *
 * The displayed value is *derived* during render rather than pushed from the
 * effect. `tweened` only holds a value while an animation is actually in
 * flight; every other case — first value, unchanged value, reduced motion,
 * data not loaded — falls straight through to `value`. That keeps the effect
 * free of synchronous setState, and means there is no frame on which the
 * component can render a stale or phantom number.
 *
 * @param {number|undefined} value Target value.
 * @returns {number} The value to display right now.
 */
export function useCountUp(value) {
    // Non-null only while a tween is running.
    const [tweened, setTweened] = useState(null)
    const previous = useRef(value)
    const frame = useRef(null)

    useEffect(() => {
        const from = previous.current
        previous.current = value

        // Nothing to tween: the first value we have ever seen, an unchanged
        // value, a value that is not a number, or reduced motion. Tweening
        // from "unknown" would be a phantom transition, and showing 0 while
        // data loads would be a lie. Render derives the right answer in all
        // of these cases, so there is nothing to push from here.
        const canTween =
            Number.isFinite(value) &&
            Number.isFinite(from) &&
            from !== value &&
            !prefersReducedMotion()

        if (!canTween) {
            // Drop any tween still in flight so its onUpdate cannot overwrite
            // the derived value.
            frame.current?.revert()
            frame.current = null
            return
        }

        const proxy = { v: from }
        frame.current = animate(proxy, {
            v: value,
            duration: DURATION.slow,
            ease: EASE.move,
            onUpdate: () => setTweened(Math.round(proxy.v)),
            // Releasing back to null returns rendering to `value`, which also
            // guarantees the number lands exactly on the real total rather than
            // on a rounded tween sample.
            onComplete: () => setTweened(null),
        })

        return () => {
            frame.current?.revert()
            frame.current = null
        }
    }, [value])

    if (tweened !== null) return tweened
    return Number.isFinite(value) ? value : 0
}

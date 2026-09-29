/**
 * Motion design tokens — the single source of truth for Coup animation.
 *
 * The app's visual language is "luxury casino": near-black surfaces, gold
 * accents, a Playfair Display serif over DM Sans. Motion follows suit — slow,
 * weighted, deliberate. Things settle rather than bounce. Nothing springs
 * cartoonishly, because a game about lying to your friends should feel
 * composed, not toy-like.
 *
 * Two rules hold everywhere:
 *   1. Motion never blocks a decision. Every duration here is short enough that
 *      a player is never waiting on an animation to learn what they can do.
 *   2. Motion never carries information on its own. The animation confirms
 *      something the text already says, so removing it costs nothing.
 */

/** Durations in milliseconds. */
export const DURATION = {
    instant: 120,
    fast: 200,
    normal: 320,
    slow: 520,
    deliberate: 760,
}

/**
 * Easing vocabulary.
 *
 * `out(n)` / `in(n)` are anime.js power easings — higher n means a more
 * abrupt start and a longer settle. We stay inside the out / inOut families
 * for all UI motion; only a couple of "released" moments use `in`, for motion
 * that should feel like it is leaving rather than arriving.
 */
export const EASE = {
    /** Entrances — decelerate hard into their final position. */
    entrance: 'out(3)',
    /** Exits — accelerate away from the viewer. */
    exit: 'in(2)',
    /** Transitions between two on-screen states. */
    move: 'inOut(2)',
    /** Ambient loops (pulse, shimmer, glow) — must breathe, not snap. */
    breathe: 'inOut(2)',
}

/**
 * Springs, for the moments that should feel physical rather than timed.
 * Exported as factories because anime.js springs are parameter objects, and
 * callers should not be able to mutate a shared one.
 *
 * A spring ease derives its own duration from its physics, so do not also pass
 * `duration` to the same tween — one of the two is silently ignored and the
 * intent becomes ambiguous.
 *
 * Damping ratio is `c / (2·√(k·m))`. Below 1 the spring overshoots; `soft` sits
 * at roughly 1.0, which lands with a barely-perceptible settle rather than a
 * visible bounce. That matters most on `GameOver`, where the spring is applied
 * to a large, full-screen surface.
 */
export const spring = {
    /** Modal and card entry — lands with a whisper of overshoot. */
    soft: () => ({ stiffness: 120, damping: 22, mass: 1 }),
    /** Button press — tight, near-instant, barely overshoots. */
    press: () => ({ stiffness: 260, damping: 18, mass: 0.7 }),
}

/** Start-time offsets, for rhythm across a group of siblings. */
export const STAGGER = {
    /** Standard list cadence: lobby rows, opponent cards, final standings. */
    list: 40,
    /** Denser grids: exchange and influence card pickers. */
    card: 55,
}

/**
 * True when the user has asked their OS to reduce motion.
 *
 * Every animation in the app is gated on this — see `useAnimeScope` and
 * `useCountUp`. When it returns true, components skip animation creation
 * entirely and the elements simply render in their natural resting state,
 * which is why no animation in this codebase sets a persistent inline style.
 *
 * Guarded defensively: jsdom and some older browsers have no `matchMedia`.
 */
export function prefersReducedMotion() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false
    }
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
        return false
    }
}

/**
 * Resolve a CSS-module class to the elements inside a component's scope root.
 *
 * Anime.js accepts selector strings and will resolve them against the scope
 * root, but passing resolved elements is unambiguous: it cannot accidentally
 * match a second instance of the same component, and it cannot silently match
 * nothing because of a hashed class name typo.
 *
 * The root itself is included when it carries the class. Most components put
 * their `ref` on the very element whose entrance they animate, and
 * `querySelectorAll` does not return the element you call it on — so a strict
 * descendants-only lookup made every one of those animations a silent no-op.
 * Anime.js logs a warning for it, which is easy to miss and invisible to
 * tests, so the lookup is forgiving instead.
 *
 * The result is a plain array, possibly empty. Anime.js treats an empty target
 * list as a no-op, so conditional subtrees need no guard.
 *
 * @param {HTMLElement} root Scope root from `useAnimeScope`.
 * @param {string} className A CSS-module class, without the leading dot.
 * @returns {Element[]}
 */
export function selAll(root, className) {
    if (!root) return []
    const self = root.classList && root.classList.contains(className) ? [root] : []
    return [...self, ...root.querySelectorAll(`.${className}`)]
}

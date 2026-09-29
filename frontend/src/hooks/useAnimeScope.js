import { useEffect, useRef, useCallback } from 'react'
import { createScope } from 'animejs'
import { prefersReducedMotion } from '../utils/motion'

/**
 * Encapsulate anime.js animations inside a React component.
 *
 * Returns `[rootRef, scopeRef, play]`:
 *
 *   rootRef   Attach to the element that bounds the animation. The `root` is
 *             handed to `setup` so it can resolve its own targets, and it is
 *             what keeps two mounted instances of the same component apart —
 *             PlayRoom renders `<Opponents>` twice (the board and the
 *             target-picker modal), and an unscoped `animate('.player')` would
 *             make picking a target ripple across both.
 *
 *   scopeRef  The live Scope, or `null` when motion is reduced. Callers must
 *             not `.revert()` it — the hook owns teardown.
 *
 *   play      Run a one-off animation in response to an event, from inside the
 *             same scope. No-ops after unmount and under reduced motion.
 *
 * `setup(root)` runs whenever `deps` change, starting with mount, and receives
 * the scope root so it can resolve its own targets — use `selAll` from
 * `utils/motion` to turn CSS-module class names into element lists. Targets
 * are resolved as elements rather than selector strings so a hashed class-name
 * typo fails visibly instead of silently matching nothing.
 *
 * Any anime.js instance created inside `setup` is registered on the scope and
 * reverted with it, which is what makes the StrictMode double-mount and the
 * `deps` replay safe.
 *
 * `deps` matters for any component whose markup does not exist on its first
 * render — which is most of them. Effects run *after* render, so a scope
 * created on mount finds `rootRef.current` still null, quietly does nothing,
 * and never gets another chance. Two shapes hit this: a component that returns
 * `null` until a condition is met (`Modal`, `ExchangeModal`, `GameOver`), and
 * a page that renders `<Loader />` while a query is in flight (`Landing`,
 * `Lobby`, `PlayRoom`). Both need the gating flag in `deps`, which also makes
 * the entrance replay each time the surface opens rather than only on mount.
 *
 * React 19 StrictMode intentionally mounts effects twice in development.
 * `createScope` + `revert()` is the documented pairing for that, and re-running
 * `setup` against a brand-new scope is idempotent because the old one was
 * already fully torn down.
 *
 * @param {(root: HTMLElement) => void} [setup]
 * @param {unknown[]} [deps] Defaults to mount-only.
 */
export function useAnimeScope(setup, deps = []) {
    const rootRef = useRef(null)
    const scopeRef = useRef(null)
    const setupRef = useRef(setup)

    // Keep the latest setup without making it a dependency — the animation
    // must not re-run just because an unrelated closure changed identity.
    setupRef.current = setup

    useEffect(() => {
        const root = rootRef.current
        if (!root || prefersReducedMotion()) return

        const scope = createScope({ root })
        scopeRef.current = scope

        try {
            if (setupRef.current) {
                scope.add(() => setupRef.current(root))
            }
        } catch (error) {
            // A failing animation must never take the UI down with it.
            console.error('[motion] scope setup failed', error)
            scope.revert()
            scopeRef.current = null
        }

        return () => {
            scope.revert()
            if (scopeRef.current === scope) scopeRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    /**
     * Fire an animation from an event handler — a coin changing, a challenge
     * landing, a row gaining its ready badge.
     *
     * Re-enters the scope so the instance is tracked and reverted on unmount
     * rather than leaking. If the component has already unmounted, or the user
     * prefers reduced motion, this is a no-op.
     *
     * Returns the created instance so callers that animate a *changing* target
     * (an active-turn glow that moves between players) can `.revert()` it and
     * strip the inline styles anime.js applied. Anything left behind would
     * otherwise outlive the state that caused it.
     *
     * @param {(root: HTMLElement) => unknown} factory
     */
    const play = useCallback((factory) => {
        const scope = scopeRef.current
        const root = rootRef.current
        if (!scope || !root || prefersReducedMotion()) return

        let result
        try {
            scope.add(() => {
                result = factory(root)
            })
        } catch (error) {
            console.error('[motion] animation failed', error)
        }
        return result
    }, [])

    return [rootRef, scopeRef, play]
}

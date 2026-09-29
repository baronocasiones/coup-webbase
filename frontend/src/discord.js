import { DiscordSDK } from '@discord/embedded-app-sdk'

let discordSdk = null
let auth = null

/**
 * Whether the Discord handshake is even worth attempting.
 *
 * `initDiscord()` is async, so awaiting it always defers by at least a
 * microtask — which is fine for the handshake but not for deciding whether to
 * show a loading gate. Callers that render a loader while Discord resolves can
 * use this synchronously as their initial state: when the client id is absent
 * there is nothing to wait for, so the gate should never appear.
 */
export function isDiscordConfigured() {
    return Boolean(import.meta.env.VITE_DISCORD_CLIENT_ID)
}

/**
 * Initialize the Discord Embedded App SDK.
 * Returns the auth object with user info, or null if not running in Discord.
 */
export async function initDiscord() {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
    if (!clientId) return null

    try {
        discordSdk = new DiscordSDK(clientId)
        await discordSdk.ready()

        // Authorize with Discord (opens OAuth popup if needed)
        const { code } = await discordSdk.commands.authorize({
            client_id: clientId,
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: ['identify'],
        })

        // Exchange code for access token via backend
        const proxyOrigin = window.location.origin
        const response = await fetch(`${proxyOrigin}/.proxy/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        })

        if (!response.ok) throw new Error('Token exchange failed')
        const { access_token } = await response.json()

        // Authenticate with the SDK
        auth = await discordSdk.commands.authenticate({ access_token })
        return auth
    } catch (err) {
        console.warn('Discord SDK init failed (running standalone?):', err)
        return null
    }
}

/** Get the authenticated Discord user, or null */
export function getDiscordUser() {
    return auth?.user || null
}

/** Check if currently running inside a Discord iframe */
export function isRunningInDiscord() {
    return discordSdk !== null
}

/** Get the raw Discord SDK instance */
export function getDiscordSdk() {
    return discordSdk
}

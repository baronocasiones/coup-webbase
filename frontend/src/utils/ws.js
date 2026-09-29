/**
 * Build a WebSocket URL for the given path.
 *
 * Inside a Discord Activity iframe: relative URLs go through Discord's proxy.
 * Standalone: uses WS_HOST/WS_PORT env vars or defaults to localhost:8000.
 */
export function buildWsUrl(path, userId) {
    const params = userId ? `?user_id=${userId}` : ''

    // Inside Discord iframe — use relative URL through proxy
    if (typeof window !== 'undefined' && window.parent !== window) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        return `${protocol}://${window.location.host}${path}${params}`
    }

    // Standalone mode
    const wsHost = import.meta.env.WS_HOST || 'localhost'
    const wsPort = import.meta.env.WS_PORT || '8000'
    return `ws://${wsHost}:${wsPort}${path}${params}`
}

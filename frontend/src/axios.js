import axios from 'axios'

/**
 * Determine the API base URL.
 *
 * Inside a Discord Activity iframe: relative URLs go through Discord's proxy.
 * Standalone: uses API_URL env var or defaults to localhost:8000.
 */
function getApiBase() {
    // Inside Discord iframe — relative URLs go through proxy
    if (typeof window !== 'undefined' && window.parent !== window) {
        return ''
    }
    // Standalone mode
    return import.meta.env.API_URL || 'http://localhost:8000'
}

const instance = axios.create({
    baseURL: getApiBase(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

export default instance

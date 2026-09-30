import axios from '../axios'


export async function getGame() {
    const response = await axios.get('/game-state')
    return response.data
}

export async function getUserPlayer(userId) {
    const response = await axios.get('/user-player', {params: {user_id: userId}})
    return response.data
}

/**
 * End a decided game and put the table back in the lobby for a rematch.
 *
 * POST rather than GET because it changes state, and it must be called *before*
 * navigating: the backend has no other way to move a finished game out of
 * GAME_OVER, and `add_player` refuses everyone until it does, so a client that
 * navigated first would arrive at a lobby it can neither add to nor start from.
 *
 * Deliberately not routed through the `/test/*` endpoints, which 403 unless
 * ENV=testing — a finished game had no way out in production because of exactly
 * that gate.
 */
export async function returnToLobby() {
    const response = await axios.post('/game/reset')
    return response.data
}

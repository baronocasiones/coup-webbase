import axios from '../axios'

// for getting all the players fro the server to update the states
export async function getPlayers() {
    const response = await axios.get('/players')
    return response.data
}

// for removing player from the server (disconnecting)
export async function removePlayer({playerId, gameWs}) {
    try {
        const { data } = await axios.delete('/player', { params: { user_id: playerId } })
        if(gameWs) {
            gameWs.send(JSON.stringify({
                action: 'disconnect',
                players: data
            }))
        }

    } catch (error) {
        console.error('Error disconnecting player:', error.message)
    }
}

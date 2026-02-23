import axios from '../axios'


// for getting all the players fro the server to update the states
export async function getPlayers() {
    const response = await axios.get('/players')
    console.log('RESPONSE: ', response.data)
    return response.data
}

// for removing player from the server (disconnecting)
export async function removePlayer({playerId, gameWs}) {
    try {
        const { data } = await axios.delete('/player', { params: { user_id: playerId } })
        gameWs.send(JSON.stringify({
            action: 'disconnect',
            players: data
        }))
    } catch (error) {
        console.error('Error disconnecting player:', error.message)
    }
}

// for changing player ready state
export async function changeReadyState({playerId, gameWs, newReadyState}){
    try{
        const { data } = await axios.patch('/player', null, {params: { target_player_id: playerId, new_ready_state: newReadyState}})
        gameWs.send(JSON.stringify({
            action: 'ready',
            players: data
        }))
    } catch(error){
        console.error(error.response.data.detail)
    }
}


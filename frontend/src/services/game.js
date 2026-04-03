import axios from '../axios'


export async function getGame() {
    const response = await axios.get('/game-state')
    return response.data
}

export async function getUserPlayer(userId) {
    const response = await axios.get('/user-player', {params: {user_id: userId}})
    return response.data
}

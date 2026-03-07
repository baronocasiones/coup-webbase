import axios from '../axios'


export async function getGame() {
    const response = await axios.get('/game-state')
    return response.data
}

import axios from '../axios'


export const getGame = async () => {
    const response = await axios.get('/game-state')
    return response.data
}

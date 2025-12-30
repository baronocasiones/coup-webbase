import axios from '../axios'

export async function getPlayers(){
    const response = await axios.get('/players')
    return response.data
}


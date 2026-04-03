import axios from '../axios'

export async function getChatMessages() {
    const response = await axios.get('/chats')
    return response.data
}

export async function addChatMessage({ userId, username, message, chatWs}){
    const response = await axios.post('/chat', { userId, sender_username: username, message})
    chatWs.send(JSON.stringify({
        userId,
        sender_username: username,
        message 
    }))

    return response.data
}

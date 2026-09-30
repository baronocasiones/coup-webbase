import axios from '../axios'

export async function getChatMessages() {
    const response = await axios.get('/chats')
    return response.data
}

export async function addChatMessage({ userId, username, message }) {
    // The server pushes to every other player's chat socket as part of handling
    // this POST, so the client does not also send a frame of its own.
    //
    // It used to, and the pairing was a liability: the message was only visible
    // to the table if the sender's socket happened to be open and happened to
    // send after the POST resolved. A message written while that socket was down
    // was saved and announced to nobody, with no error to suggest otherwise.
    // One write, one broadcast, no ordering to get wrong.
    const response = await axios.post('/chat', { userId, sender_username: username, message})
    return response.data
}

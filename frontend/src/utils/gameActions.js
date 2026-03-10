export const handleMove = (websocket, move, target=undefined) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        return
    }
    websocket.send(JSON.stringify({
        action: 'declare_move',
        payload: {
            move,
            target
        }
    }))
}

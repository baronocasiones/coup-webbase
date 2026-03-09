export const handleMove = (websocket, move) => {
    websocket.send(JSON.stringify({
        action: 'declare_move',
        payload: {
            move: move,
            target: null,
        }
    }))
}

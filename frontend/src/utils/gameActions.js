/**
 * WebSocket action broadcasters for the game.
 * All functions send JSON messages to the game WebSocket.
 */

function send(ws, data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(data))
}

export const broadcastMove = (websocket, move, target = undefined) => {
    send(websocket, {
        action: 'declare_move',
        payload: { move, target }
    })
}

export const broadcastBlock = (websocket, blockMove) => {
    send(websocket, {
        action: 'block',
        payload: { move: blockMove }
    })
}

export const broadcastChallenge = (websocket, challengerId) => {
    send(websocket, {
        action: 'challenge',
        payload: { challengerId }
    })
}

export const broadcastNoChallenge = (websocket) => {
    send(websocket, {
        action: 'no_challenge',
        payload: {}
    })
}

export const broadcastExchangeSelection = (websocket, cards) => {
    send(websocket, {
        action: 'exchange_selection',
        payload: { cards }
    })
}

export const broadcastInfluenceSelection = (websocket, card) => {
    send(websocket, {
        action: 'influence_selection',
        payload: { card }
    })
}

/** Map of game actions to their required influence */
export const ACTION_REQUIRES = {
    TAX: 'DUKE',
    ASSASSINATE: 'ASSASSIN',
    STEAL: 'CAPTAIN',
    EXCHANGE: 'AMBASSADOR',
}

/** Map of block moves to their required influence */
export const BLOCK_REQUIRES = {
    'BLOCK FOREIGN AID': 'DUKE',
    'BLOCK ASSASSINATION': 'CONTESSA',
    'BLOCK STEAL': 'CAPTAIN', // or AMBASSADOR
}

/** Available block moves for each blockable action */
export const BLOCKABLE_ACTIONS = {
    'FOREIGN AID': ['BLOCK FOREIGN AID'],
    ASSASSINATE: ['BLOCK ASSASSINATION'],
    STEAL: ['BLOCK STEAL'],
}

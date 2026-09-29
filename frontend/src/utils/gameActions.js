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

export const broadcastChallengeSelection = (websocket, card) => {
    send(websocket, {
        action: 'challenge_selection',
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

/**
 * Map of block moves to the influences that would back them.
 *
 * Values are lists, not single cards, because a block can be backed by more
 * than one influence. `BLOCK STEAL` was previously mapped to `CAPTAIN` alone,
 * which is wrong: `Influence.AMBASSADOR` also grants `BlockMove.BLOCK_STEAL`
 * (see `backend/services/Influence.py`). Any consumer that treated this as a
 * scalar would wrongly report a Captain-less Ambassador's block as unbackable.
 */
export const BLOCK_REQUIRES = {
    'BLOCK FOREIGN AID': ['DUKE'],
    'BLOCK ASSASSINATION': ['CONTESSA'],
    'BLOCK STEAL': ['CAPTAIN', 'AMBASSADOR'],
}

/** Available block moves for each blockable action */
export const BLOCKABLE_ACTIONS = {
    'FOREIGN AID': ['BLOCK FOREIGN AID'],
    ASSASSINATE: ['BLOCK ASSASSINATION'],
    STEAL: ['BLOCK STEAL'],
}

/**
 * Actions aimed at another player, and so blockable only by that player.
 *
 * Mirrors `GameAction.is_targetable()` on the backend. A block answers being
 * *hit*, so for one of these only the target may block; everyone else may
 * challenge or pass. This is a list rather than "any action with a Block button"
 * because the untargeted case has to stay legal.
 *
 * Foreign Aid is absent on purpose. It is blockable but has no target, and in
 * Coup any player may block it, so there is no one to restrict the block to. The
 * backend applies the same carve-out, and a test pins it so the two cannot
 * drift.
 */
export const TARGETABLE_ACTIONS = ['COUP', 'ASSASSINATE', 'STEAL']

/**
 * Actions the rules let a player challenge.
 *
 * Mirrors `GameAction.is_challengeable()` on the backend, which is the same
 * three-way exclusion. Anything absent here is not challengeable — a Coup or
 * Income is resolved by the declaration itself, and Foreign Aid can only be
 * blocked.
 */
export const UNCHALLENGEABLE_ACTIONS = ['INCOME', 'COUP', 'FOREIGN AID']

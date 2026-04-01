import { useReducer } from "React";

export const gameStates = {
    perform_action: "PERFORM_ACTION",
    move_declared: "MOVE_DECLARED",
    choose_cards: "CHOOSE_CARDS",
    waiting_for_moves: "WAITING_FOR_MOVES",
    challenge: "CHALLENGE",
};

export function useStateMachine(initialState) {
    const stateReducer = (state, { type, payload }) => {
        switch (state.gameState) {
            case gameStates.waiting_for_moves:
                if (type !== move_declared) {
                    return { gameState: gameStates.move_declared, payload };
                } else {
                    return state;
                }
            case gameStates.move_declared:
                if (type === challenge) {
                    return { gameState: gameStates.challenge, payload };
                } else if (payload.move === "EXCHAGE") {
                    return { gameState: gameStates.choose_cards, payload };
                } else if (type === gameStates.perform_action) {
                    return { gameState: gameStates.perform_action, payload };
                } else {
                    return state;
                }
            case gameStates.perform_action:
                if (payload.status === "SUCCESS") {
                    return { gameState: gameStates.waiting_for_moves, payload };
                } else {
                    return state;
                }
            case gameStates.waiting_for_moves:
                if (type === gameStates.move_declared) {
                    return { gameState: gameStates.move_declared, payload };
                } else {
                    return state;
                }
            case gameStates.challenge:
                if (payload.challengeResult === "WIN") {
                    return { gameState: gameStates.perform_action, payload };
                } else if (payload.challengeResult === "LOSE") {
                    return { gameState: gameStates.choose_cards, payload };
                }
        }
    };
    return useReducer(stateReducer, initialState);
}

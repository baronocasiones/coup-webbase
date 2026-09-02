import { useReducer } from "react";

export const gameStates = {
    perform_action: "PERFORM_ACTION",
    move_declared: "MOVE_DECLARED",
    choose_cards: "CHOOSE_CARDS",
    choosing_target: "CHOOSING_TARGET",
    waiting_for_moves: "WAITING_FOR_MOVES",
    challenge: "CHALLENGE",
};

const TARGETED_MOVES = ["COUP", "ASSASSINATE", "STEAL"];

export function useStateMachine(initialState) {
    const stateReducer = (state, { type, payload }) => {
        switch (state.gameState) {
            case gameStates.waiting_for_moves:
                if (type === gameStates.move_declared) {
                    return { gameState: gameStates.move_declared, payload };
                } else if (type === gameStates.choosing_target) {
                    return { gameState: gameStates.choosing_target, payload }
                } else {
                    return state;
                } 
            case gameStates.move_declared:
                if (type === gameStates.challenge) {
                    return { gameState: gameStates.challenge, payload };
                } else if (TARGETED_MOVES.includes(payload.move)) {
                    return { gameState: gameStates.choosing_target, payload };
                } else if (payload.move === "EXCHANGE") {
                    return { gameState: gameStates.choose_cards, payload };
                } else {
                    return state;
                }
            case gameStates.choosing_target: {
                const move = state.payload.move
                if (payload.target) {
                    return { gameState: gameStates.move_declared, payload: {...payload, move }  }
                }
                return state;
            }
            case gameStates.choose_cards:
                if (payload.chosenCard){
                    return { gameState: gameStates.perform_action, payload }
                }
                return state;
            case gameStates.perform_action:
                if (payload.status === "SUCCESS") {
                    return { gameState: gameStates.waiting_for_moves, payload };
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

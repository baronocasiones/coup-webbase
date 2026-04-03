import styles from "./../styles/PlayRoom.module.css";
import PrimaryButton from "./../components/PrimaryButton.jsx";
import ChatBox from "./../components/ChatBox.jsx";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, getUserPlayer } from "../services/game.js";
import Loader from "../components/Loader.jsx";
import { broadcastMove } from "../utils/gameActions.js";
import Opponents from "../components/Opponents.jsx";
import Modal from "../components/Modal.jsx";
import { useStateMachine, gameStates } from "../hooks/useStateMachine.js";

const TARGETED_MOVES = ["COUP", "ASSASSINATE", "STEAL"];

function PlayRoom() {
    const userId = sessionStorage.getItem("userId");
    const navigate = useNavigate();
    const gameWs = useRef(null);
    const queryClient = useQueryClient();
    const [stateMachineState, dispatchGameState] = useStateMachine({
        gameState: gameStates.waiting_for_moves,
        payload: null,
    });
    const [isChoosingTarget, setIsChoosingTarget] = useState(false);
    const { data: gameState, isLoading: gameStateIsLoading } = useQuery({
        queryKey: ["gameState"],
        queryFn: getGame,
        onError: (error) => {
            console.log(error);
            navigate("/lobby");
            if (error.response.state === 404) {
                navigate("/");
            }
        },
    });
    const players = gameState?.playersState;
    const { data: userPlayer, isLoading: userPlayerIsLoading } = useQuery({
        queryKey: ["gameState", userId],
        queryFn: () => getUserPlayer(userId),
        onError: (error) => {
            if (error.response.status === 404) {
                navigate("/");
            }
        },
    });
    const currentTurn = gameState?.currentTurn;
    const isMyTurn = useMemo(
        () => currentTurn?.id === userId,
        [currentTurn, userId],
    );
    const handleAction = useCallback(
        (action) => {
            if (TARGETED_MOVES.includes(action)) {
                dispatchGameState({
                    type: gameStates.choosing_target,
                    payload: { move: action },
                });
                setIsChoosingTarget(true);
                return;
            } else {
                dispatchGameState({
                    type: gameStates.move_declared,
                    payload: { move: action },
                });
                broadcastMove(gameWs.current, action);
            }
            queryClient.invalidateQueries(["gameState", userId]);
        },
        [userId, gameWs, broadcastMove, setIsChoosingTarget],
    );

    useEffect(() => {
        console.log(stateMachineState)
        const target = stateMachineState?.payload?.target;
        const move = stateMachineState?.payload?.move;
        if (target && move) {
            broadcastMove(gameWs.current, move, target);
        }
        queryClient.invalidateQueries({ queryKey: ["gameState"]})
    }, [stateMachineState]);

    useEffect(() => {
        const previous = document.body.style.backgroundColor;
        document.body.style.backgroundColor = "#0F1419";

        return () => {
            document.body.style.backgroundColor = previous;
        };
    }, []);

    useEffect(() => {
        if (!gameStateIsLoading) {
            if (!gameState) {
                navigate("/");
            }
        }
    }, [gameState, gameStateIsLoading]);

    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || "localhost";
        const wsPort = import.meta.env.WS_PORT || "8000";
        gameWs.current = new WebSocket(
            `ws://${wsHost}:${wsPort}/ws/game?user_id=${userId}`,
        );

        gameWs.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            queryClient.invalidateQueries({ queryKey: ["gameState"] });
            console.log("Received message:", data);
        };

        gameWs.current.onerror = () => {
            gameWs.current = new WebSocket(
                `ws://${wsHost}:${wsPort}/ws/game?user_id=${userId}`,
            );
        };

        return () => {
            if (gameWs.current) {
                gameWs.current.close();
            }
        };
    }, []);

    if (gameStateIsLoading || userPlayerIsLoading) {
        return <Loader />;
    }
    if (!userId) {
        navigate("/");
    }

    return (
        <>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.currentTurnContainer}>
                    <label className={styles.turnLabel}>Current Turn</label>
                    <span className={styles.turnName}>
                        {currentTurn.id === userId ? "It's your" : `${currentTurn.name}'s`}{" "}
                        Turn
                    </span>
                </div>
                <div className={styles.statsContainer}>
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Round</label>
                        <span className={styles.statValue}>3</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Players Left</label>
                        <span className={styles.statValue}>4 / 4</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Treasury</label>
                        <span className={styles.statValue}>💰 50</span>
                    </div>
                </div>
                <PrimaryButton
                    text="Menu"
                    backgroundColor="rgba(255, 255, 255, 0.08)"
                    width="auto"
                />
            </div>

            {/* Main content */}
            <div className={styles.mainContainer}>
                <div className={styles.gameContainer}>
                    <Opponents opponents={players} userId={userId} />
                </div>

                <ChatBox header="Game Log" withSubmission={false} />
            </div>

            {/* User panel */}
            <div className={styles.userUIContainer}>
                {/* Left: User Info Section */}
                <div className={styles.userInfo}>
                    <div className={styles.userIdentifier}>
                        <div className={styles.userAvatarWrapper}>
                            <span
                                className={styles.profilePic}
                                style={{
                                    backgroundColor: "#E94560",
                                    width: "52px",
                                    height: "52px",
                                }}
                            ></span>
                            <span className={styles.youBadge}>You</span>
                        </div>
                        <div className={styles.userNameBlock}>
                            <h3 className={styles.userName}>{userPlayer.name}</h3>
                            <span className={styles.userStatus}>● Active</span>
                        </div>
                    </div>
                    <div className={styles.userCoins}>
                        <span
                            className={styles.coinIcon}
                            style={{ width: "24px", height: "24px" }}
                        ></span>
                        <span className={styles.userCoinValue}>
                            {userPlayer.coins} coins
                        </span>
                    </div>
                </div>

                {/* Center: Cards and Actions Section */}
                <div className={styles.userCenterSection}>
                    {/* Cards */}
                    <div className={styles.userCardsContainer}>
                        {userPlayer.cards.map((card, index) => (
                            <span key={index} className={styles.userCard}>
                                <span className={styles.userCardIcon}>🃏</span>
                                <h4 className={styles.userCardName}>{card}</h4>
                            </span>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className={styles.userRightSection}>
                        <div className={styles.userMoves}>
                            <p className={styles.movesLabel}>Your Actions</p>
                            <div className={styles.movesRow}>
                                <PrimaryButton
                                    text="Income"
                                    backgroundColor="rgba(255,255,255,0.07)"
                                    width="auto"
                                    onClick={isMyTurn ? () => handleAction("INCOME") : undefined}
                                />
                                <PrimaryButton
                                    text="Foreign Aid"
                                    backgroundColor="rgba(255,255,255,0.07)"
                                    width="auto"
                                    onClick={
                                        isMyTurn ? () => handleAction("FOREIGN AID") : undefined
                                    }
                                />
                                <PrimaryButton
                                    text="Coup (7)"
                                    width="auto"
                                    onClick={isMyTurn ? () => handleAction("COUP") : undefined}
                                />
                            </div>
                            <div className={styles.movesRow}>
                                <PrimaryButton
                                    text="Tax"
                                    backgroundColor="rgba(102,126,234,0.25)"
                                    width="auto"
                                    onClick={isMyTurn ? () => handleAction("TAX") : undefined}
                                />
                                <PrimaryButton
                                    text="Assassinate"
                                    backgroundColor="rgba(102,126,234,0.25)"
                                    width="auto"
                                    onClick={
                                        isMyTurn ? () => handleAction("ASSASSINATE") : undefined
                                    }
                                />
                                <PrimaryButton
                                    text="Steal"
                                    backgroundColor="rgba(102,126,234,0.25)"
                                    width="auto"
                                    onClick={isMyTurn ? () => handleAction("STEAL") : undefined}
                                />
                                <PrimaryButton
                                    text="Exchange"
                                    backgroundColor="rgba(102,126,234,0.25)"
                                    width="auto"
                                    onClick={
                                        isMyTurn ? () => handleAction("EXCHANGE") : undefined
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Move preview */}
            <Modal
                status="Choosing Target"
                style={{ visibility: isChoosingTarget ? "visible" : "hidden" }}
            >
                <Opponents
                    opponents={players}
                    userId={userId}
                    setIsChoosingTarget={setIsChoosingTarget}
                    isChoosingTarget={isChoosingTarget}
                    dispatchGameState={dispatchGameState}
                />
            </Modal>
        </>
    );
}

export default PlayRoom;

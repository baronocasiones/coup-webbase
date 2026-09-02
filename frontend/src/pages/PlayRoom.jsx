import styles from "./../styles/PlayRoom.module.css";
import PrimaryButton from "./../components/PrimaryButton.jsx";
import ChatBox from "./../components/ChatBox.jsx";
import GameStatus from "./../components/GameStatus.jsx";
import ChallengePanel from "./../components/ChallengePanel.jsx";
import ExchangeModal from "./../components/ExchangeModal.jsx";
import InfluencePicker from "./../components/InfluencePicker.jsx";
import GameOver from "./../components/GameOver.jsx";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGame, getUserPlayer } from "../services/game.js";
import Loader from "../components/Loader.jsx";
import {
    broadcastMove,
    broadcastBlock,
    broadcastChallenge,
    broadcastNoChallenge,
    broadcastExchangeSelection,
    broadcastInfluenceSelection,
    BLOCKABLE_ACTIONS,
} from "../utils/gameActions.js";
import Opponents from "../components/Opponents.jsx";
import Modal from "../components/Modal.jsx";

const TARGETED_MOVES = ["COUP", "ASSASSINATE", "STEAL"];

function PlayRoom() {
    const userId = sessionStorage.getItem("userId");
    const navigate = useNavigate();
    const gameWs = useRef(null);
    const queryClient = useQueryClient();
    const [isChoosingTarget, setIsChoosingTarget] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const { data: gameState, isLoading: gameStateIsLoading } = useQuery({
        queryKey: ["gameState"],
        queryFn: getGame,
        onError: (error) => {
            if (error.response?.status === 404) {
                navigate("/");
            } else {
                navigate("/lobby");
            }
        },
    });

    const players = gameState?.playersState;

    const { data: userPlayer, isLoading: userPlayerIsLoading } = useQuery({
        queryKey: ["gameState", userId],
        queryFn: () => getUserPlayer(userId),
        onError: (error) => {
            if (error.response?.status === 404) {
                navigate("/");
            }
        },
    });

    const currentTurn = gameState?.currentTurn;
    const isMyTurn = useMemo(
        () => currentTurn?.id === userId,
        [currentTurn, userId],
    );

    /** Check if player has the required card for an action */
    const hasCard = useCallback(
        (action) => {
            if (!userPlayer?.cards) return false
            const required = {
                TAX: "DUKE",
                ASSASSINATE: "ASSASSIN",
                STEAL: "CAPTAIN",
                EXCHANGE: "AMBASSADOR",
            }
            return userPlayer.cards.includes(required[action])
        },
        [userPlayer],
    );

    /** Check if player can afford an action */
    const canAfford = useCallback(
        (action) => {
            if (!userPlayer) return false
            switch (action) {
                case "COUP": return userPlayer.coins >= 7
                case "ASSASSINATE": return userPlayer.coins >= 3
                default: return true
            }
        },
        [userPlayer],
    );

    /** Force coup if player has 10+ coins */
    const isForceCoup = useMemo(
        () => isMyTurn && userPlayer?.coins >= 10 && gameState?.state === "WAITING_FOR_ACTION",
        [isMyTurn, userPlayer, gameState?.state],
    );

    const handleAction = useCallback(
        (action) => {
            if (TARGETED_MOVES.includes(action)) {
                setPendingAction(action)
                setIsChoosingTarget(true)
                return
            }
            broadcastMove(gameWs.current, action)
            queryClient.invalidateQueries(["gameState", userId])
        },
        [userId, queryClient],
    );

    const handleTargetSelected = useCallback(
        (targetId) => {
            setIsChoosingTarget(false)
            if (pendingAction) {
                broadcastMove(gameWs.current, pendingAction, targetId)
                setPendingAction(null)
                queryClient.invalidateQueries(["gameState", userId])
            }
        },
        [pendingAction, userId, queryClient],
    );

    const handleChallenge = useCallback(() => {
        broadcastChallenge(gameWs.current, userId)
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleNoChallenge = useCallback(() => {
        broadcastNoChallenge(gameWs.current)
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleBlock = useCallback((blockMove) => {
        broadcastBlock(gameWs.current, blockMove)
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleExchangeSelect = useCallback((cards) => {
        broadcastExchangeSelection(gameWs.current, cards)
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleInfluenceSelect = useCallback((card) => {
        broadcastInfluenceSelection(gameWs.current, card)
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    // Set body background
    useEffect(() => {
        const previous = document.body.style.backgroundColor;
        document.body.style.backgroundColor = "#08080D";
        return () => {
            document.body.style.backgroundColor = previous;
        };
    }, []);

    // Redirect if no game state
    useEffect(() => {
        if (!gameStateIsLoading && !gameState) {
            navigate("/");
        }
    }, [gameState, gameStateIsLoading]);

    // WebSocket connection
    useEffect(() => {
        const wsHost = import.meta.env.WS_HOST || "localhost";
        const wsPort = import.meta.env.WS_PORT || "8000";
        gameWs.current = new WebSocket(
            `ws://${wsHost}:${wsPort}/ws/game?user_id=${userId}`,
        );

        gameWs.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.action === "challenge_result") {
                    // Challenge result received — refresh game state
                    queryClient.invalidateQueries({ queryKey: ["gameState"] });
                } else if (data.error) {
                    console.error("Game WS error:", data.error);
                } else {
                    // State update
                    queryClient.invalidateQueries({ queryKey: ["gameState"] });
                }
            } catch (err) {
                console.error("Failed to parse game WS message:", err);
            }
        };

        gameWs.current.onerror = () => {
            // Reconnect on error
            setTimeout(() => {
                if (gameWs.current?.readyState === WebSocket.CLOSED) {
                    gameWs.current = new WebSocket(
                        `ws://${wsHost}:${wsPort}/ws/game?user_id=${userId}`,
                    );
                }
            }, 2000);
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

    const gameStateValue = gameState?.state
    const showExchangeModal = gameStateValue === "PENDING_EXCHANGE" && isMyTurn
    const showInfluencePicker = gameStateValue === "INFLUENCE_SELECTION_PENDING" && isMyTurn
    const showChallengePanel = (gameStateValue === "ACTION_DECLARED" || gameStateValue === "BLOCK_DECLARED") && !isMyTurn

    return (
        <>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.currentTurnContainer}>
                    <label className={styles.turnLabel}>Current Turn</label>
                    <span className={styles.turnName}>
                        {currentTurn?.id === userId ? "It's your" : `${currentTurn?.name ?? "Unknown"}'s`}{" "}
                        Turn
                    </span>
                </div>
                <div className={styles.statsContainer}>
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Players Left</label>
                        <span className={styles.statValue}>{players?.length ?? 0} / 6</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <label className={styles.statLabels}>Cards in Deck</label>
                        <span className={styles.statValue}>{gameState?.cardsInDeck ?? 0}</span>
                    </div>
                </div>
                <PrimaryButton text="Menu" variant="secondary" width="auto" />
            </div>

            {/* Main content */}
            <div className={styles.mainContainer}>
                <div className={styles.gameContainer}>
                    {/* Game Status */}
                    <GameStatus gameState={gameState} userId={userId} />

                    {/* Challenge Panel */}
                    {showChallengePanel && (
                        <ChallengePanel
                            gameState={gameState}
                            userId={userId}
                            onChallenge={handleChallenge}
                            onNoChallenge={handleNoChallenge}
                            onBlock={handleBlock}
                        />
                    )}

                    {/* Opponents */}
                    <Opponents
                        opponents={players}
                        userId={userId}
                        currentTurnId={currentTurn?.id}
                    />
                </div>

                <ChatBox header="Game Log" withSubmission={false} />
            </div>

            {/* User panel */}
            <div className={styles.userUIContainer}>
                {/* Left: User Info Section */}
                <div className={styles.userInfo}>
                    <div className={styles.userIdentifier}>
                        <div className={styles.userAvatarWrapper}>
                            <span className={styles.profilePic}></span>
                            <span className={styles.youBadge}>You</span>
                        </div>
                        <div className={styles.userNameBlock}>
                            <h3 className={styles.userName}>{userPlayer.name}</h3>
                            <span className={styles.userStatus}>Active</span>
                        </div>
                    </div>
                    <div className={styles.userCoins}>
                        <span className={styles.coinIcon}></span>
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
                                <span className={styles.userCardIcon}>
                                    {card === "DUKE" ? "👑" : card === "ASSASSIN" ? "🗡️" : card === "CAPTAIN" ? "⚓" : card === "AMBASSADOR" ? "📜" : "🛡️"}
                                </span>
                                <h4 className={styles.userCardName}>{card}</h4>
                            </span>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className={styles.userRightSection}>
                        <div className={styles.userMoves}>
                            <p className={styles.movesLabel}>
                                {isForceCoup ? "Forced Coup!" : "Your Actions"}
                            </p>
                            <div className={styles.movesRow}>
                                {isForceCoup ? (
                                    <PrimaryButton
                                        text="Coup (7)"
                                        onClick={() => handleAction("COUP")}
                                    />
                                ) : (
                                    <>
                                        <PrimaryButton
                                            text="Income"
                                            variant="secondary"
                                            width="auto"
                                            onClick={() => handleAction("INCOME")}
                                            disabled={!isMyTurn || gameStateValue !== "WAITING_FOR_ACTION"}
                                        />
                                        <PrimaryButton
                                            text="Foreign Aid"
                                            variant="secondary"
                                            width="auto"
                                            onClick={() => handleAction("FOREIGN AID")}
                                            disabled={!isMyTurn || gameStateValue !== "WAITING_FOR_ACTION"}
                                        />
                                        <PrimaryButton
                                            text="Coup (7)"
                                            width="auto"
                                            onClick={() => handleAction("COUP")}
                                            disabled={!isMyTurn || !canAfford("COUP") || gameStateValue !== "WAITING_FOR_ACTION"}
                                        />
                                    </>
                                )}
                            </div>
                            {!isForceCoup && (
                                <div className={styles.movesRow}>
                                    <PrimaryButton
                                        text="Tax"
                                        width="auto"
                                        onClick={() => handleAction("TAX")}
                                        disabled={!isMyTurn || !hasCard("TAX") || gameStateValue !== "WAITING_FOR_ACTION"}
                                    />
                                    <PrimaryButton
                                        text="Assassinate"
                                        width="auto"
                                        onClick={() => handleAction("ASSASSINATE")}
                                        disabled={!isMyTurn || !hasCard("ASSASSINATE") || !canAfford("ASSASSINATE") || gameStateValue !== "WAITING_FOR_ACTION"}
                                    />
                                    <PrimaryButton
                                        text="Steal"
                                        width="auto"
                                        onClick={() => handleAction("STEAL")}
                                        disabled={!isMyTurn || !hasCard("STEAL") || gameStateValue !== "WAITING_FOR_ACTION"}
                                    />
                                    <PrimaryButton
                                        text="Exchange"
                                        width="auto"
                                        onClick={() => handleAction("EXCHANGE")}
                                        disabled={!isMyTurn || !hasCard("EXCHANGE") || gameStateValue !== "WAITING_FOR_ACTION"}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Target Selection Modal */}
            <Modal
                status="Choosing Target"
                style={{ visibility: isChoosingTarget ? "visible" : "hidden" }}
            >
                <Opponents
                    opponents={players}
                    userId={userId}
                    setIsChoosingTarget={setIsChoosingTarget}
                    isChoosingTarget={isChoosingTarget}
                    onPlayerClick={handleTargetSelected}
                />
            </Modal>

            {/* Exchange Modal */}
            <ExchangeModal
                visible={showExchangeModal}
                cards={gameState?.exchangeCards || userPlayer?.cards || []}
                currentCardCount={userPlayer?.cards?.length || 2}
                onSelect={handleExchangeSelect}
            />

            {/* Influence Picker Modal */}
            <InfluencePicker
                visible={showInfluencePicker}
                cards={userPlayer?.cards || []}
                onSelect={handleInfluenceSelect}
            />

            {/* Game Over Screen */}
            <GameOver gameState={gameState} userId={userId} />
        </>
    );
}

export default PlayRoom;

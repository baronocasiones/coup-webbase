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
    broadcastChallengeSelection,
    ACTION_REQUIRES,
} from "../utils/gameActions.js";
import { buildWsUrl } from "../utils/ws.js";
import Opponents from "../components/Opponents.jsx";
import Modal from "../components/Modal.jsx";
import { useAnimeScope } from "../hooks/useAnimeScope";
import { useCountUp } from "../hooks/useCountUp";
import { animate, stagger } from "animejs";
import { DURATION, EASE, STAGGER } from "../utils/motion";

const TARGETED_MOVES = ["COUP", "ASSASSINATE", "STEAL"];

function PlayRoom() {
    const userId = sessionStorage.getItem("userId");
    const navigate = useNavigate();
    const gameWs = useRef(null);
    const userCardsRef = useRef(null);
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

    // Your own pile. Snapping it hides the most-watched event in the game.
    const displayedCoins = useCountUp(userPlayer?.coins);

    // Identity of the hand, not the array reference — the game state refetches
    // after every action and hands back a fresh array each time, so keying on
    // the cards themselves would re-deal the hand on every poll.
    const handKey = (userPlayer?.cards ?? []).join(",");

    // Scope only, no mount animation: PlayRoom is one long-lived page that
    // re-renders on every state change, and the per-surface components below it
    // each own their entrance. The root is the user panel, which is the only
    // subtree this scope's own animations target.
    const [rootRef, , play] = useAnimeScope(undefined, [
        gameStateIsLoading,
        userPlayerIsLoading,
    ]);

    /**
     * Re-deal the hand whenever it actually changes — drawn in Exchange, or a
     * card lost to a challenge. Keyed on the card names so a refetch that
     * returns the same hand does not replay it.
     */
    useEffect(() => {
        const container = userCardsRef.current;
        if (!container || container.children.length === 0) return;

        play(() =>
            // Spread out of the live HTMLCollection so the target list is a
            // stable snapshot rather than something the DOM can mutate
            // mid-animation.
            animate([...container.children], {
                opacity: [{ from: 0 }, { to: 1 }],
                rotateY: [{ from: -70 }, { to: 0 }],
                translateY: [{ from: 14 }, { to: 0 }],
                duration: DURATION.normal,
                ease: EASE.entrance,
                delay: stagger(STAGGER.card, { from: "last" }),
            })
        );
    }, [handKey, play]);

    /** Check if player has the required card for an action */
    const hasCard = useCallback(
        (action) => {
            if (!userPlayer?.cards) return false
            const required = ACTION_REQUIRES[action]
            return required ? userPlayer.cards.includes(required) : false
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
            queryClient.invalidateQueries(["gameState"])
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
                queryClient.invalidateQueries(["gameState"])
                queryClient.invalidateQueries(["gameState", userId])
            }
        },
        [pendingAction, userId, queryClient],
    );

    const handleChallenge = useCallback(() => {
        broadcastChallenge(gameWs.current, userId)
        queryClient.invalidateQueries(["gameState"])
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleNoChallenge = useCallback(() => {
        broadcastNoChallenge(gameWs.current)
        queryClient.invalidateQueries(["gameState"])
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleBlock = useCallback((blockMove) => {
        broadcastBlock(gameWs.current, blockMove)
        queryClient.invalidateQueries(["gameState"])
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleExchangeSelect = useCallback((cards) => {
        broadcastExchangeSelection(gameWs.current, cards)
        queryClient.invalidateQueries(["gameState"])
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleInfluenceSelect = useCallback((card) => {
        broadcastInfluenceSelection(gameWs.current, card)
        queryClient.invalidateQueries(["gameState"])
        queryClient.invalidateQueries(["gameState", userId])
    }, [userId, queryClient]);

    const handleChallengeSelect = useCallback((card) => {
        broadcastChallengeSelection(gameWs.current, card)
        queryClient.invalidateQueries(["gameState"])
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
        gameWs.current = new WebSocket(buildWsUrl('/ws/game', userId))

        gameWs.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.action === "challenge_result") {
                    // Challenge result received — refresh game state
                    queryClient.invalidateQueries({ queryKey: ["gameState"] });
                    queryClient.invalidateQueries({ queryKey: ["gameState", userId] });
                } else if (data.action === "game_reset") {
                    // Somebody ended the game and put the table back in the
                    // lobby. They navigate on their own click; everyone else
                    // would otherwise sit on a game-over screen describing a
                    // game the server has already discarded.
                    queryClient.setQueryData(["gameState"], data.gameState);
                    queryClient.invalidateQueries({ queryKey: ["gameState", userId] });
                    navigate("/lobby");
                } else if (data.error) {
                    console.error("Game WS error:", data.error);
                } else {
                    // State update
                    //
                    // Both queries, not just the public one. The target of a
                    // Coup or Assassinate has to surrender a card, and the
                    // picker is fed from `/user-player`, so a broadcast that
                    // only refreshed `["gameState"]` left the target's own hand
                    // stale — the picker would show the pre-surrender hand.
                    queryClient.invalidateQueries({ queryKey: ["gameState"] });
                    queryClient.invalidateQueries({ queryKey: ["gameState", userId] });
                }
            } catch (err) {
                console.error("Failed to parse game WS message:", err);
            }
        };

        gameWs.current.onerror = () => {
            // Reconnect on error
            setTimeout(() => {
                if (gameWs.current?.readyState === WebSocket.CLOSED) {
                    gameWs.current = new WebSocket(buildWsUrl('/ws/game', userId))
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
    const isChallengeLoser = gameStateValue === "CHALLENGE_HANDLE" && gameState?.challengeLoser?.id === userId

    /*
     * Who gets to pick a card off their own hand.
     *
     * Two paths, and they key on different fields on purpose.
     *
     * A lost challenge — `challengeLoser`, already published, and it really is
     * the person named.
     *
     * Coup / Assassinate — `pendingInfluenceTarget`, not `isMyTurn`. The server
     * requires the surrender from the *target*, but `next_turn()` has not run,
     * so `currentTurn` is still the attacker. Gating on `isMyTurn` handed the
     * picker to the attacker over their own hand; the server rejected every
     * selection with a SynchronizationError that the WS handler turned into an
     * `error` frame the client only `console.error`s, and the table sat in
     * INFLUENCE_SELECTION_PENDING forever with nobody able to act.
     */
    const isPendingInfluenceTarget =
        gameStateValue === "INFLUENCE_SELECTION_PENDING"
        && gameState?.pendingInfluenceTarget === userId
    const showInfluencePicker = isPendingInfluenceTarget || isChallengeLoser

    /*
     * Who gets to answer a declared move, per state.
     *
     * ACTION_DECLARED — everyone except the player who declared it. They can
     * challenge it, block it, or pass.
     *
     * BLOCK_DECLARED — only the player whose action was blocked. This is the
     * inverse of the case above, and inverting it is the whole point:
     * `currentTurn` does not move until the block resolves, so during
     * BLOCK_DECLARED it still names the *actor*. A single `!isMyTurn` rule
     * therefore hides the panel from the one player who legally decides
     * whether to challenge the block, and shows it to the blocker — who cannot
     * challenge their own block and who could otherwise resolve their own
     * bluff with "Accept Block".
     *
     * The server also publishes `blockerId` for this, and `ChallengePanel`
     * uses it to refuse the blocker directly. Two mechanisms, on purpose: this
     * predicate decides who is *offered* the response, and the blocker check
     * makes it structurally impossible for the blocker to answer even if a
     * future state or refetch produces an unexpected pairing.
     */
    const showChallengePanel =
        gameStateValue === "ACTION_DECLARED" ? !isMyTurn
            : gameStateValue === "BLOCK_DECLARED" ? isMyTurn
                : false

    return (
        <div className={styles.playRoom} ref={rootRef}>
            {/* Header — three tracks so the turn indicator and the stats sit
                on a shared grid. The right cell is deliberately empty; the dead
                "Menu" button that used to sit there had no handler at all. */}
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
                <div className={styles.headerSpacer} />
            </div>

            {/* Main content */}
            <div className={styles.mainContainer}>
                <div className={styles.gameContainer}>
                    {/* Game Status */}
                    <GameStatus gameState={gameState} userId={userId} />

                    {/* Challenge Panel — `visible` is the only gate. An outer
                        `{showChallengePanel && ...}` wrapper alongside it would
                        be the same rule enforced twice, which is how this bug
                        got in: the predicate and the component's own
                        `isMyTurn` check drifted apart because there were two
                        copies to keep in step. */}
                    <ChallengePanel
                        visible={showChallengePanel}
                        gameState={gameState}
                        userId={userId}
                        cards={userPlayer?.cards || []}
                        onChallenge={handleChallenge}
                        onNoChallenge={handleNoChallenge}
                        onBlock={handleBlock}
                    />

                    {/* Opponents */}
                    <Opponents
                        opponents={players}
                        userId={userId}
                        currentTurnId={currentTurn?.id}
                    />
                </div>

                <ChatBox header="Game Log" withSubmission={false} />
            </div>

            {/* User panel — the grid's final row */}
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
                    {/*
                     * The coin total is conveyed twice, deliberately.
                     *
                     * `displayedCoins` is the tweened value: it is what the eye
                     * reads as the pile climbs, and it is hidden from assistive
                     * tech so a screen reader is never walked through the ~30
                     * intermediate frames. The visually-hidden `role="status"`
                     * alongside it carries the settled value, which is what
                     * actually gets announced. Same number, two channels, no
                     * double-reading and no announced animation frames.
                     */}
                    <div className={styles.userCoins}>
                        <span className={styles.coinIcon} aria-hidden="true"></span>
                        <span className={styles.userCoinValue} aria-hidden="true">
                            {displayedCoins} coins
                        </span>
                        <span className="srOnly" role="status" aria-live="polite" aria-atomic="true">
                            You have {userPlayer.coins} coins
                        </span>
                    </div>
                </div>

                {/* Center: Cards and Actions Section */}
                <div className={styles.userCenterSection}>
                    {/* Cards */}
                    <div className={styles.influencesBlock}>
                        <p className={styles.influencesLabel}>Your Influences</p>
                        <div className={styles.userCardsContainer} ref={userCardsRef}>
                            {userPlayer.cards.map((card, index) => (
                                <span key={index} className={styles.userCard}>
                                    <span className={styles.userCardIcon}>
                                        {card === "DUKE" ? "👑" : card === "ASSASSIN" ? "🗡️" : card === "CAPTAIN" ? "⚓" : card === "AMBASSADOR" ? "📜" : "🛡️"}
                                    </span>
                                    <h4 className={styles.userCardName}>{card}</h4>
                                </span>
                            ))}
                        </div>
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
                                        pulse
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
                                        disabled={!isMyTurn || gameStateValue !== "WAITING_FOR_ACTION"}
                                        bluff={!hasCard("TAX")}
                                        title={!hasCard("TAX") ? "You don't hold a Duke — this is a bluff!" : undefined}
                                    />
                                    <PrimaryButton
                                        text="Assassinate"
                                        width="auto"
                                        onClick={() => handleAction("ASSASSINATE")}
                                        disabled={!isMyTurn || !canAfford("ASSASSINATE") || gameStateValue !== "WAITING_FOR_ACTION"}
                                        bluff={!hasCard("ASSASSINATE")}
                                        title={!hasCard("ASSASSINATE") ? "You don't hold an Assassin — this is a bluff!" : undefined}
                                    />
                                    <PrimaryButton
                                        text="Steal"
                                        width="auto"
                                        onClick={() => handleAction("STEAL")}
                                        disabled={!isMyTurn || gameStateValue !== "WAITING_FOR_ACTION"}
                                        bluff={!hasCard("STEAL")}
                                        title={!hasCard("STEAL") ? "You don't hold a Captain — this is a bluff!" : undefined}
                                    />
                                    <PrimaryButton
                                        text="Exchange"
                                        width="auto"
                                        onClick={() => handleAction("EXCHANGE")}
                                        disabled={!isMyTurn || gameStateValue !== "WAITING_FOR_ACTION"}
                                        bluff={!hasCard("EXCHANGE")}
                                        title={!hasCard("EXCHANGE") ? "You don't hold an Ambassador — this is a bluff!" : undefined}
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

            {/* Exchange Modal
                *
                * `exchangeCards` is the full pool — this player's current cards
                * followed by the two just drawn — and the server only sends it
                * to the exchanging player, over the private `/user-player`
                * channel. It used to be read from `gameState.exchangeCards`,
                * a field the backend has never sent, so the `||` fallback
                * always won and the modal offered the player's own hand back to
                * them: "You drew 0 cards", one selectable card, nothing to swap.
                *
                * The hand fallback below is a safety net for the window where
                * the query is refetching. It should be unreachable — the server
                * omits the pool for every player who is not mid-exchange.
                */}
            <ExchangeModal
                visible={showExchangeModal}
                cards={userPlayer?.exchangeCards || userPlayer?.cards || []}
                currentCardCount={userPlayer?.cards?.length ?? 0}
                onSelect={handleExchangeSelect}
            />

            {/* Influence Picker Modal */}
            <InfluencePicker
                visible={showInfluencePicker}
                cards={userPlayer?.cards || []}
                onSelect={isChallengeLoser ? handleChallengeSelect : handleInfluenceSelect}
            />

            {/* Game Over Screen */}
            <GameOver
                gameState={gameState}
                userId={userId}
                onReturnedToLobby={() => navigate('/lobby')}
            />
        </div>
    );
}

export default PlayRoom;

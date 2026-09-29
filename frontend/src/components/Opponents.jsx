import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import styles from "./../styles/PlayRoom.module.css";
import { useAnimeScope } from "../hooks/useAnimeScope";
import { useCountUp } from "../hooks/useCountUp";
import { DURATION, EASE, STAGGER, selAll } from "../utils/motion";

/** Tweened coin readout. Extracted so `useCountUp` gets its own hook scope. */
function CoinValue({ value }) {
    const shown = useCountUp(value);
    return <span className={styles.coinValue}>{shown}</span>;
}

function Opponents({
    opponents,
    userId,
    setIsChoosingTarget,
    isChoosingTarget = false,
    currentTurnId,
    onPlayerClick
}) {
    // Element refs keyed by player id. Selectors alone cannot express "only the
    // player whose turn it is", and scoping to `root` keeps the board and the
    // target-picker modal — two mounted copies of this component — from
    // animating each other.
    const cardRefs = useRef({});
    const cardCountRefs = useRef({});

    /**
     * Identity of the hands on the table.
     *
     * Keyed on card *counts* rather than the `opponents` array itself: the game
     * state refetches after every single action and hands back a fresh array
     * each time, so depending on it would re-deal every hand on every move
     * rather than when someone actually loses a card.
     */
    const handsKey = opponents
        .map((p) => `${p.id}:${p.numberOfCards}`)
        .join("|");

    const [rootRef, , play] = useAnimeScope((root) => {
        // Board reveal. Cards arrive in table order, which matches the order
        // they will be read in — the eye is walked across the opposition left
        // to right rather than being shown everything at once.
        animate(selAll(root, styles.player), {
            opacity: { from: 0 },
            translateY: { from: 14 },
            scale: { from: 0.96 },
            duration: DURATION.normal,
            delay: stagger(STAGGER.list),
        });
    });

    /**
     * Reaction to a challenge result. When a card count drops, every player's
     * row of face-down cards re-deals itself — the one change that can cost
     * someone the game.
     *
     * The active-turn glow is deliberately NOT animated here. It is a
     * continuous ambient loop bound to the `.playerActive` class in CSS, so it
     * stops the moment the turn moves with no inline style left to revert — and
     * a pre-painted shadow faded via `opacity` stays composited, where a
     * `box-shadow` tween forced a repaint every frame. See PlayRoom.module.css.
     */
    useEffect(() => {
        const rows = Object.values(cardCountRefs.current);
        if (rows.length === 0) return;

        const anim = play(() =>
            animate(rows, {
                scale: [{ to: 1.12 }, { to: 1 }],
                duration: DURATION.normal,
                ease: EASE.entrance,
                delay: stagger(STAGGER.list),
            })
        );

        return () => anim?.revert();
    }, [handsKey, play]);

    /**
     * Targeting cue. When a targeted action opens the picker, each candidate
     * gets one short lift in table order. A single pulse, not a loop — a
     * looping "pick me" would compete with the player's actual decision.
     */
    useEffect(() => {
        if (!isChoosingTarget) return;

        const cards = Object.values(cardRefs.current);
        if (cards.length === 0) return;

        const anim = play(() =>
            animate(cards, {
                scale: [{ to: 1.05 }, { to: 1 }],
                duration: DURATION.fast,
                ease: EASE.entrance,
                delay: stagger(50),
            })
        );

        return () => anim?.revert();
    }, [isChoosingTarget, play]);

    /**
     * Reaction to a challenge result. When a card count drops, every player's
     * row of face-down cards re-deals itself — the one change that can cost
     * someone the game.
     */
    useEffect(() => {
        const rows = Object.values(cardCountRefs.current);
        if (rows.length === 0) return;

        const anim = play(() =>
            animate(rows, {
                scale: [{ to: 1.12 }, { to: 1 }],
                duration: DURATION.normal,
                ease: EASE.entrance,
                delay: stagger(STAGGER.list),
            })
        );

        return () => anim?.revert();
    }, [handsKey, play]);

    const handlePlayerClick = (playerId) => {
        if (isChoosingTarget && onPlayerClick) {
            setIsChoosingTarget(false);
            onPlayerClick(playerId);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    /**
     * While a targeted action is pending, each opponent is a real control and
     * renders as a `<button>`. It was a `<div onClick>`, which put Coup,
     * Assassinate and Steal out of reach for anyone navigating by keyboard or
     * screen reader — the three actions that decide the game.
     *
     * Swapping the tag only while targeting keeps the resting board markup
     * untouched, so the visual language and existing test selectors are
     * unaffected.
     */
    const isTargetable = isChoosingTarget && Boolean(onPlayerClick);

    return (
        <div className={styles.playersContainer} ref={rootRef}>
            {opponents.map((player) => {
                if (player.id === userId) return null;

                const Tag = isTargetable ? 'button' : 'div';

                return (
                    <Tag
                        key={player.id}
                        ref={(el) => { cardRefs.current[player.id] = el }}
                        type={isTargetable ? 'button' : undefined}
                        aria-label={
                            isTargetable
                                ? `Target ${player.name}, ${player.coins} coins, ${player.numberOfCards} ${player.numberOfCards === 1 ? 'card' : 'cards'}`
                                : undefined
                        }
                        className={`${styles.player} ${currentTurnId === player.id ? styles.playerActive : ''} ${isChoosingTarget ? styles.playerTargetable : ''}`}
                        onClick={isTargetable ? () => handlePlayerClick(player.id) : undefined}
                    >
                        <div className={styles.avatarWrapper}>
                            <span className={styles.profilePic}>
                                {getInitials(player.name)}
                            </span>
                            <span className={styles.onlineIndicator}></span>
                        </div>
                        <span className={styles.playerName}>{player.name}</span>
                        <div className={styles.coins}>
                            <span className={styles.coinIcon}></span>
                            <CoinValue value={player.coins} />
                        </div>
                        <div
                            className={styles.cardsContainer}
                            ref={(el) => { cardCountRefs.current[player.id] = el }}
                        >
                            {Array.from({ length: player.numberOfCards }, (_, i) => (
                                <span key={i} className={styles.card}></span>
                            ))}
                        </div>
                    </Tag>
                );
            })}
        </div>
    );
}

export default Opponents;

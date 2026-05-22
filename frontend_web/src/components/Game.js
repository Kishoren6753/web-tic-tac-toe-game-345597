import React, { useEffect, useMemo, useRef, useState } from 'react';
import Board from './Board';
import {
    AI_DIFFICULTIES,
    DEFAULT_GAME_CONFIG,
    PLAYERS,
    createEmptyBoard,
    formatMsAsClock,
    formatSquarePosition,
    getAIMove,
    getHintMove,
    getNextPlayer,
    getWinner,
    hasTimeExpired,
    isDraw,
    normalizeGameConfig,
    normalizeTimeControlSeconds,
} from '../gameLogic';

/**
 * @typedef {{
 *  board: (null|'X'|'O')[],
 *  moveIndex: number,
 *  moveSquareIndex: (number|null),
 *  player: ('X'|'O'|null)
 * }} HistoryEntry
 */

const GAME_MODES = Object.freeze({
    LOCAL: 'Local (2 players)',
    AI: 'Single-player vs AI',
});

const TURN_MODES = Object.freeze({
    CLASSIC: 'Classic',
    TIMED: 'Timed (chess clock)',
});

const DEFAULT_TIME_CONTROL_SECONDS = 30;
const TICK_MS = 200;

// PUBLIC_INTERFACE
export default function Game() {
    /** This is the main interactive game component. */

    const [config, setConfig] = useState(() => normalizeGameConfig(DEFAULT_GAME_CONFIG));
    const boardSize = config.boardSize;
    const winLength = config.winLength;

    /**
     * History model:
     * - history[0] is always the empty board (moveIndex 0).
     * - stepIndex points at the currently viewed/active step in history.
     * - When time-traveling and making a new move, we truncate "future" steps.
     */
    const [startingPlayer, setStartingPlayer] = useState(PLAYERS.X);
    const [history, setHistory] = useState(() => {
        /** @type {HistoryEntry[]} */
        const initial = [
            {
                board: createEmptyBoard(boardSize),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ];
        return initial;
    });
    const [stepIndex, setStepIndex] = useState(0);

    // Mode settings
    const [mode, setMode] = useState(GAME_MODES.LOCAL);
    const [turnMode, setTurnMode] = useState(TURN_MODES.CLASSIC);
    const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTIES.MEDIUM);

    // Timed-turn settings/state
    const [timeControlSeconds, setTimeControlSeconds] = useState(DEFAULT_TIME_CONTROL_SECONDS);
    const timeControlMs = useMemo(
        () => normalizeTimeControlSeconds(timeControlSeconds) * 1000,
        [timeControlSeconds]
    );

    const [clocks, setClocks] = useState(() => ({
        [PLAYERS.X]: timeControlMs,
        [PLAYERS.O]: timeControlMs,
    }));

    /**
     * We use Date.now-based delta to avoid drift and to behave well under fake timers in tests.
     * lastTickAtRef is "when we last applied time decrement".
     */
    const lastTickAtRef = useRef(/** @type {number|null} */ (null));

    // Hint UI state: a short message shown after pressing Hint.
    const [hintMessage, setHintMessage] = useState('');

    // In single-player mode: human is always X, AI is always O.
    const humanPlayer = PLAYERS.X;
    const aiPlayer = PLAYERS.O;

    // Persistent-in-session scoreboard (does not reset unless explicitly requested).
    const [scores, setScores] = useState(() => ({
        xWins: 0,
        oWins: 0,
        draws: 0,
    }));

    const board = history[stepIndex].board;

    const currentPlayer = useMemo(() => {
        // With a fixed starter per round: X at move 0, then alternate.
        // If starter is O, swap parity.
        const turnsFromStart = stepIndex % 2;
        if (startingPlayer === PLAYERS.X) {
            return turnsFromStart === 0 ? PLAYERS.X : PLAYERS.O;
        }
        return turnsFromStart === 0 ? PLAYERS.O : PLAYERS.X;
    }, [startingPlayer, stepIndex]);

    const winnerInfo = useMemo(() => getWinner(board, config), [board, config]);
    const draw = useMemo(() => isDraw(board, config), [board, config]);

    const isSinglePlayer = mode === GAME_MODES.AI;
    const isTimedTurns = turnMode === TURN_MODES.TIMED && mode === GAME_MODES.LOCAL;

    /**
     * Time-out rules:
     * - Only apply in Local + Timed mode.
     * - Only when viewing the latest step (no time travel).
     * - If the current player's clock hits 0, they lose immediately.
     *
     * We compute this as derived state from clocks/currentPlayer to keep rendering simple.
     */
    const isViewingLatest = stepIndex === history.length - 1;

    const timedOutLoser = useMemo(() => {
        if (!isTimedTurns) return null;
        if (!isViewingLatest) return null;
        if (winnerInfo || draw) return null;
        const remaining = clocks[currentPlayer];
        if (hasTimeExpired(remaining)) return currentPlayer;
        return null;
    }, [clocks, currentPlayer, draw, isTimedTurns, isViewingLatest, winnerInfo]);

    const timedWinner = timedOutLoser ? getNextPlayer(timedOutLoser) : null;

    const gameOver = Boolean(winnerInfo) || draw || Boolean(timedWinner);

    // In AI mode we disable undo/redo/time travel to avoid inconsistent
    // interactions (AI would need to recompute and potentially alter history).
    // In timed mode we also disable it to keep the clock consistent.
    const canUndo = !isSinglePlayer && !isTimedTurns && stepIndex > 0;
    const canRedo = !isSinglePlayer && !isTimedTurns && stepIndex < history.length - 1;

    /**
     * We must update scores exactly once per finished round.
     * Using a ref avoids extra state and prevents double-counting across re-renders.
     *
     * IMPORTANT: We only count a result when viewing the latest step (i.e., not time-traveling).
     * That ensures undo/redo doesn't inflate the scoreboard.
     */
    const hasCountedResultRef = useRef(false);

    if (gameOver && !hasCountedResultRef.current && isViewingLatest) {
        hasCountedResultRef.current = true;

        setScores((prev) => {
            if (winnerInfo?.winner === PLAYERS.X) return { ...prev, xWins: prev.xWins + 1 };
            if (winnerInfo?.winner === PLAYERS.O) return { ...prev, oWins: prev.oWins + 1 };
            if (timedWinner === PLAYERS.X) return { ...prev, xWins: prev.xWins + 1 };
            if (timedWinner === PLAYERS.O) return { ...prev, oWins: prev.oWins + 1 };
            if (draw) return { ...prev, draws: prev.draws + 1 };
            return prev;
        });
    }

    const status = useMemo(() => {
        if (winnerInfo) return `Winner: ${winnerInfo.winner}`;
        if (timedWinner) return `Time out — Winner: ${timedWinner}`;
        if (draw) return "It's a draw!";
        if (isSinglePlayer) {
            if (currentPlayer === humanPlayer) return `Your turn: ${humanPlayer}`;
            return `AI thinking… (${aiDifficulty})`;
        }
        if (isTimedTurns) return `Timed turn: ${currentPlayer}`;
        return `Turn: ${currentPlayer}`;
    }, [
        aiDifficulty,
        currentPlayer,
        draw,
        humanPlayer,
        isSinglePlayer,
        isTimedTurns,
        timedWinner,
        winnerInfo,
    ]);

    // Hint availability rules:
    // - Only when game is active and viewing the latest history step.
    // - In AI mode, only allow hint during the human player's turn (avoid hint during AI thinking).
    const canHint = useMemo(() => {
        if (gameOver) return false;
        if (!isViewingLatest) return false;
        if (isSinglePlayer && currentPlayer !== humanPlayer) return false;
        return true;
    }, [currentPlayer, gameOver, humanPlayer, isSinglePlayer, isViewingLatest]);

    /**
     * Build the move list UI labels (e.g. "Go to move #3 (X @ r2c1)").
     */
    const moveItems = useMemo(() => {
        return history.map((entry, idx) => {
            if (idx === 0) {
                return {
                    idx,
                    label: 'Go to game start',
                };
            }
            const player = entry.player;
            const square = entry.moveSquareIndex;
            const squareHuman =
                typeof square === 'number' ? formatSquarePosition(square, boardSize) : '?';
            return {
                idx,
                label: `Go to move #${idx} (${player} @ ${squareHuman})`,
            };
        });
    }, [boardSize, history]);

    function applyMove(index, player) {
        const nextBoard = board.slice();
        nextBoard[index] = player;

        setHistory((prev) => {
            const trimmed = prev.slice(0, stepIndex + 1);
            const nextEntry = {
                board: nextBoard,
                moveIndex: trimmed.length,
                moveSquareIndex: index,
                player,
            };
            return trimmed.concat(nextEntry);
        });
        setStepIndex((prev) => prev + 1);
        setHintMessage('');

        // In timed mode, the clock should immediately switch to the other player after a move.
        // The ticking effect uses currentPlayer + clocks; no direct action needed here beyond
        // ensuring the next tick uses the updated currentPlayer.
        lastTickAtRef.current = Date.now();
    }

    function handleSquareClick(index) {
        if (gameOver) return;
        if (!isViewingLatest) return; // only allow moves at the head of history
        if (board[index] !== null) return;

        if (isSinglePlayer) {
            // Human can only play their own turn.
            if (currentPlayer !== humanPlayer) return;
            applyMove(index, humanPlayer);
            return;
        }

        applyMove(index, currentPlayer);
    }

    function showHint() {
        if (!canHint) return;

        const move = getHintMove(board, {
            player: currentPlayer,
            config,
        });

        if (typeof move !== 'number') {
            setHintMessage('No hint available.');
            return;
        }

        const pos = formatSquarePosition(move, boardSize);
        setHintMessage(`Hint: ${currentPlayer} → ${pos}`);
    }

    function jumpToStep(nextIndex) {
        if (isSinglePlayer) return;
        if (isTimedTurns) return;
        setStepIndex(nextIndex);
    }

    function undoMove() {
        if (!canUndo) return;
        setStepIndex((prev) => Math.max(0, prev - 1));
        setHintMessage('');
    }

    function redoMove() {
        if (!canRedo) return;
        setStepIndex((prev) => Math.min(history.length - 1, prev + 1));
        setHintMessage('');
    }

    function resetClocks() {
        setClocks({
            [PLAYERS.X]: timeControlMs,
            [PLAYERS.O]: timeControlMs,
        });
        lastTickAtRef.current = null;
    }

    function resetBoardKeepStarter() {
        setHistory([
            {
                board: createEmptyBoard(boardSize),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        setHintMessage('');
        resetClocks();
        // Allow the next finished round to be counted.
        hasCountedResultRef.current = false;
    }

    function newGameSwapStarter() {
        // In single-player mode we keep starter fixed as X to avoid confusing assignment.
        const nextStarter = isSinglePlayer ? PLAYERS.X : getNextPlayer(startingPlayer);
        setStartingPlayer(nextStarter);
        setHistory([
            {
                board: createEmptyBoard(boardSize),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        setHintMessage('');
        resetClocks();
        // Allow the next finished round to be counted.
        hasCountedResultRef.current = false;
    }

    function resetScores() {
        setScores({ xWins: 0, oWins: 0, draws: 0 });
    }

    function handleModeChange(nextMode) {
        setMode(nextMode);
        setHintMessage('');

        // Reset timed mode when leaving local mode to avoid surprising UX.
        if (nextMode !== GAME_MODES.LOCAL) {
            setTurnMode(TURN_MODES.CLASSIC);
        }

        // Normalize starter for AI mode so the human (X) starts.
        if (nextMode === GAME_MODES.AI) {
            setStartingPlayer(PLAYERS.X);
        }

        // Reset the board when mode changes to avoid mixing expectations.
        setHistory([
            {
                board: createEmptyBoard(boardSize),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        resetClocks();
        hasCountedResultRef.current = false;
    }

    function resetForConfigChange(nextConfig) {
        const normalized = normalizeGameConfig(nextConfig);
        setConfig(normalized);
        setHintMessage('');

        // Reset the round (board size changes invalidate history).
        setHistory([
            {
                board: createEmptyBoard(normalized.boardSize),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        resetClocks();
        hasCountedResultRef.current = false;

        // Keep starter semantics; for AI always keep X.
        if (mode === GAME_MODES.AI) {
            setStartingPlayer(PLAYERS.X);
        }
    }

    function handleTurnModeChange(nextTurnMode) {
        setTurnMode(nextTurnMode);
        setHintMessage('');

        // Reset the board+clocks when switching clock mode to avoid ambiguous mid-game timing.
        setHistory([
            {
                board: createEmptyBoard(boardSize),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        resetClocks();
        hasCountedResultRef.current = false;
    }

    /**
     * Timed turns runner: decrement the active player's clock while the game is active.
     *
     * We only tick when:
     * - Local mode + Timed turn mode
     * - Viewing latest step
     * - Game not over
     */
    useEffect(() => {
        if (!isTimedTurns) return;
        if (!isViewingLatest) return;
        if (gameOver) return;

        lastTickAtRef.current = Date.now();

        const intervalId = window.setInterval(() => {
            const now = Date.now();
            const last = lastTickAtRef.current ?? now;
            const delta = Math.max(0, now - last);
            lastTickAtRef.current = now;

            setClocks((prev) => {
                const currentRemaining = prev[currentPlayer];
                const nextRemaining = Math.max(0, currentRemaining - delta);

                // If already at 0, don't keep updating (avoid extra renders).
                if (currentRemaining <= 0) return prev;

                return {
                    ...prev,
                    [currentPlayer]: nextRemaining,
                };
            });
        }, TICK_MS);

        return () => window.clearInterval(intervalId);
    }, [currentPlayer, gameOver, isTimedTurns, isViewingLatest]);

    /**
     * If the time control changes, reset clocks for fairness.
     * This is intentionally conservative and avoids tricky “apply new time control mid-game” semantics.
     */
    useEffect(() => {
        resetClocks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeControlMs]);

    /**
     * AI turn runner: after human move (or any time AI is to play), schedule AI response.
     * We only run AI when:
     * - single-player mode
     * - viewing latest step
     * - game not over
     * - it's AI's turn
     */
    useEffect(() => {
        if (!isSinglePlayer) return;
        if (!isViewingLatest) return;
        if (gameOver) return;
        if (currentPlayer !== aiPlayer) return;

        const move = getAIMove(board, {
            aiPlayer,
            humanPlayer,
            difficulty: aiDifficulty,
            config,
        });

        if (typeof move !== 'number') return;

        const t = window.setTimeout(() => {
            // Re-check basic invariants at execution time.
            setHistory((prevHistory) => {
                // If anything changed meanwhile, don't apply.
                // This is a minimal guard for React StrictMode / rapid resets.
                const last = prevHistory[prevHistory.length - 1];
                const lastBoard = last.board;

                if (getWinner(lastBoard, config) || isDraw(lastBoard, config)) return prevHistory;
                if (lastBoard[move] !== null) return prevHistory;

                const nextBoard = lastBoard.slice();
                nextBoard[move] = aiPlayer;

                const nextEntry = {
                    board: nextBoard,
                    moveIndex: prevHistory.length,
                    moveSquareIndex: move,
                    player: aiPlayer,
                };

                // Sync stepIndex to the new head.
                setStepIndex(prevHistory.length);

                return prevHistory.concat(nextEntry);
            });
        }, 350);

        return () => window.clearTimeout(t);
    }, [
        aiDifficulty,
        aiPlayer,
        board,
        config,
        currentPlayer,
        gameOver,
        humanPlayer,
        isSinglePlayer,
        isViewingLatest,
    ]);

    return (
        <div className="game">
            <div className="modeRow" aria-label="Game settings">
                <div className="modePill">
                    <span className="modeLabel">Mode</span>
                    <select
                        className="modeSelect"
                        value={mode}
                        onChange={(e) => handleModeChange(e.target.value)}
                        aria-label="Select game mode"
                    >
                        <option value={GAME_MODES.LOCAL}>{GAME_MODES.LOCAL}</option>
                        <option value={GAME_MODES.AI}>{GAME_MODES.AI}</option>
                    </select>
                </div>

                <div className="modePill">
                    <span className="modeLabel">Turns</span>
                    <select
                        className="modeSelect"
                        value={turnMode}
                        onChange={(e) => handleTurnModeChange(e.target.value)}
                        disabled={mode !== GAME_MODES.LOCAL}
                        aria-label="Select turn mode"
                    >
                        <option value={TURN_MODES.CLASSIC}>{TURN_MODES.CLASSIC}</option>
                        <option value={TURN_MODES.TIMED}>{TURN_MODES.TIMED}</option>
                    </select>
                </div>

                <div className="modePill">
                    <span className="modeLabel">Clock</span>
                    <select
                        className="modeSelect"
                        value={String(timeControlSeconds)}
                        onChange={(e) => setTimeControlSeconds(Number(e.target.value))}
                        disabled={!isTimedTurns}
                        aria-label="Select time per player"
                    >
                        {[10, 15, 20, 30, 45, 60, 90, 120].map((s) => (
                            <option key={s} value={s}>
                                {s}s each
                            </option>
                        ))}
                    </select>
                </div>

                <div className="modePill">
                    <span className="modeLabel">Difficulty</span>
                    <select
                        className="modeSelect"
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        disabled={!isSinglePlayer}
                        aria-label="Select AI difficulty"
                    >
                        <option value={AI_DIFFICULTIES.EASY}>{AI_DIFFICULTIES.EASY}</option>
                        <option value={AI_DIFFICULTIES.MEDIUM}>{AI_DIFFICULTIES.MEDIUM}</option>
                        <option value={AI_DIFFICULTIES.HARD}>{AI_DIFFICULTIES.HARD}</option>
                    </select>
                </div>

                <div className="modePill">
                    <span className="modeLabel">Board</span>
                    <select
                        className="modeSelect"
                        value={boardSize}
                        onChange={(e) =>
                            resetForConfigChange({
                                boardSize: Number(e.target.value),
                                winLength,
                            })
                        }
                        aria-label="Select board size"
                    >
                        <option value={3}>3 x 3</option>
                        <option value={4}>4 x 4</option>
                        <option value={5}>5 x 5</option>
                    </select>
                </div>

                <div className="modePill">
                    <span className="modeLabel">Win</span>
                    <select
                        className="modeSelect"
                        value={winLength}
                        onChange={(e) =>
                            resetForConfigChange({
                                boardSize,
                                winLength: Number(e.target.value),
                            })
                        }
                        aria-label="Select win length"
                    >
                        {Array.from({ length: Math.max(1, boardSize - 2) }, (_, i) => i + 3).map(
                            (k) => (
                                <option key={k} value={k}>
                                    {k} in a row
                                </option>
                            )
                        )}
                    </select>
                </div>
            </div>

            {isTimedTurns ? (
                <div className="clockRow" aria-label="Chess clock">
                    <div
                        className={
                            'clockPill clockX' +
                            (currentPlayer === PLAYERS.X && !gameOver ? ' active' : '') +
                            (hasTimeExpired(clocks[PLAYERS.X]) ? ' expired' : '')
                        }
                    >
                        <span className="clockLabel">X time</span>
                        <span className="clockValue" aria-label={`X time: ${formatMsAsClock(clocks[PLAYERS.X])}`}>
                            {formatMsAsClock(clocks[PLAYERS.X])}
                        </span>
                    </div>

                    <div
                        className={
                            'clockPill clockO' +
                            (currentPlayer === PLAYERS.O && !gameOver ? ' active' : '') +
                            (hasTimeExpired(clocks[PLAYERS.O]) ? ' expired' : '')
                        }
                    >
                        <span className="clockLabel">O time</span>
                        <span className="clockValue" aria-label={`O time: ${formatMsAsClock(clocks[PLAYERS.O])}`}>
                            {formatMsAsClock(clocks[PLAYERS.O])}
                        </span>
                    </div>
                </div>
            ) : null}

            <div className="scoreRow" aria-label="Scoreboard">
                <div className="scorePill scoreX">
                    <span className="scoreLabel">X wins</span>
                    <span className="scoreValue" aria-label={`X wins: ${scores.xWins}`}>
                        {scores.xWins}
                    </span>
                </div>

                <div className="scorePill scoreO">
                    <span className="scoreLabel">O wins</span>
                    <span className="scoreValue" aria-label={`O wins: ${scores.oWins}`}>
                        {scores.oWins}
                    </span>
                </div>

                <div className="scorePill scoreDraw">
                    <span className="scoreLabel">Draws</span>
                    <span className="scoreValue" aria-label={`Draws: ${scores.draws}`}>
                        {scores.draws}
                    </span>
                </div>
            </div>

            <div className="statusRow" role="status" aria-live="polite">
                <div className="statusPill">
                    <span className="statusLabel">{status}</span>
                </div>

                <div className="playerBadges" aria-label="Players">
                    <span
                        className={
                            'playerBadge ' + (currentPlayer === PLAYERS.X && !gameOver ? 'activeX' : '')
                        }
                    >
                        X
                    </span>
                    <span
                        className={
                            'playerBadge ' + (currentPlayer === PLAYERS.O && !gameOver ? 'activeO' : '')
                        }
                    >
                        O
                    </span>
                </div>
            </div>

            <Board
                board={board}
                boardSize={boardSize}
                onSquareClick={handleSquareClick}
                winningLine={winnerInfo?.line ?? null}
                disabled={gameOver || (isSinglePlayer && currentPlayer === aiPlayer)}
            />

            <div className="controls" aria-label="Game controls">
                <button type="button" className="btn btnGhost" onClick={undoMove} disabled={!canUndo}>
                    Undo
                </button>
                <button type="button" className="btn btnGhost" onClick={redoMove} disabled={!canRedo}>
                    Redo
                </button>

                <button type="button" className="btn btnHint" onClick={showHint} disabled={!canHint}>
                    Hint
                </button>

                <button type="button" className="btn btnPrimary" onClick={resetBoardKeepStarter}>
                    Reset Board
                </button>
                <button type="button" className="btn btnGhost" onClick={newGameSwapStarter}>
                    New Game (swap starter)
                </button>
                <button type="button" className="btn btnGhost" onClick={resetScores}>
                    Reset Scores
                </button>
            </div>

            <div className="hintRow" aria-label="Hint">
                <p className="hintText" role="status" aria-live="polite">
                    {hintMessage}
                </p>
            </div>

            <div className="historyPanel" aria-label="Move history">
                <div className="historyHeader">
                    <span className="historyTitle">History</span>
                    <span className="historyMeta" aria-label="Current move indicator">
                        Move {stepIndex} / {history.length - 1}
                    </span>
                </div>

                <ol className="historyList" aria-label="Move list">
                    {moveItems.map((item) => (
                        <li key={item.idx} className="historyItem">
                            <button
                                type="button"
                                className={'historyBtn' + (item.idx === stepIndex ? ' active' : '')}
                                onClick={() => jumpToStep(item.idx)}
                                aria-current={item.idx === stepIndex ? 'step' : undefined}
                                disabled={isSinglePlayer || isTimedTurns}
                                title={
                                    isSinglePlayer
                                        ? 'History disabled in AI mode'
                                        : isTimedTurns
                                          ? 'History disabled in timed mode'
                                          : undefined
                                }
                            >
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="help">
                <p className="helpText">
                    {isSinglePlayer ? (
                        <>
                            You are <strong>X</strong>. The AI is <strong>O</strong>. Choose a
                            difficulty and try to win.
                        </>
                    ) : isTimedTurns ? (
                        <>
                            Timed mode: each player has their own clock. If your time reaches{' '}
                            <strong>0:00</strong> you lose immediately.
                        </>
                    ) : (
                        <>
                            Click an empty square to place your mark. You can’t overwrite a filled
                            square.
                        </>
                    )}{' '}
                    <span className="helpMeta">
                        Current rules: <strong>{boardSize}×{boardSize}</strong>, win by getting{' '}
                        <strong>{winLength}</strong> in a row.
                    </span>
                </p>
            </div>
        </div>
    );
}

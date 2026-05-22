import React, { useEffect, useMemo, useRef, useState } from 'react';
import Board from './Board';
import {
    AI_DIFFICULTIES,
    createEmptyBoard,
    getAIMove,
    getNextPlayer,
    getWinner,
    isDraw,
    PLAYERS,
} from '../gameLogic';

/**
 * @typedef {{board: (null|'X'|'O')[], moveIndex: number, moveSquareIndex: (number|null), player: ('X'|'O'|null)}} HistoryEntry
 */

const GAME_MODES = Object.freeze({
    LOCAL: 'Local (2 players)',
    AI: 'Single-player vs AI',
});

// PUBLIC_INTERFACE
export default function Game() {
    /** This is the main interactive game component. */

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
                board: createEmptyBoard(),
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
    const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTIES.MEDIUM);

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

    const winnerInfo = useMemo(() => getWinner(board), [board]);
    const draw = useMemo(() => isDraw(board), [board]);
    const gameOver = Boolean(winnerInfo) || draw;

    const isSinglePlayer = mode === GAME_MODES.AI;

    // In AI mode we disable undo/redo/time travel to avoid inconsistent
    // interactions (AI would need to recompute and potentially alter history).
    const canUndo = !isSinglePlayer && stepIndex > 0;
    const canRedo = !isSinglePlayer && stepIndex < history.length - 1;

    const isViewingLatest = stepIndex === history.length - 1;

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
            if (draw) return { ...prev, draws: prev.draws + 1 };
            return prev;
        });
    }

    const status = useMemo(() => {
        if (winnerInfo) return `Winner: ${winnerInfo.winner}`;
        if (draw) return "It's a draw!";
        if (isSinglePlayer) {
            if (currentPlayer === humanPlayer) return `Your turn: ${humanPlayer}`;
            return `AI thinking… (${aiDifficulty})`;
        }
        return `Turn: ${currentPlayer}`;
    }, [aiDifficulty, currentPlayer, draw, isSinglePlayer, winnerInfo]);

    /**
     * Build the move list UI labels (e.g. "Go to move #3 (X @ 5)").
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
            const squareHuman = typeof square === 'number' ? square + 1 : '?';
            return {
                idx,
                label: `Go to move #${idx} (${player} @ ${squareHuman})`,
            };
        });
    }, [history]);

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

    function jumpToStep(nextIndex) {
        if (isSinglePlayer) return;
        setStepIndex(nextIndex);
    }

    function undoMove() {
        if (!canUndo) return;
        setStepIndex((prev) => Math.max(0, prev - 1));
    }

    function redoMove() {
        if (!canRedo) return;
        setStepIndex((prev) => Math.min(history.length - 1, prev + 1));
    }

    function resetBoardKeepStarter() {
        setHistory([
            {
                board: createEmptyBoard(),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        // Allow the next finished round to be counted.
        hasCountedResultRef.current = false;
    }

    function newGameSwapStarter() {
        // In single-player mode we keep starter fixed as X to avoid confusing assignment.
        const nextStarter = isSinglePlayer ? PLAYERS.X : getNextPlayer(startingPlayer);
        setStartingPlayer(nextStarter);
        setHistory([
            {
                board: createEmptyBoard(),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        // Allow the next finished round to be counted.
        hasCountedResultRef.current = false;
    }

    function resetScores() {
        setScores({ xWins: 0, oWins: 0, draws: 0 });
    }

    function handleModeChange(nextMode) {
        setMode(nextMode);
        // Normalize starter for AI mode so the human (X) starts.
        if (nextMode === GAME_MODES.AI) {
            setStartingPlayer(PLAYERS.X);
        }
        // Reset the board when mode changes to avoid mixing expectations.
        setHistory([
            {
                board: createEmptyBoard(),
                moveIndex: 0,
                moveSquareIndex: null,
                player: null,
            },
        ]);
        setStepIndex(0);
        hasCountedResultRef.current = false;
    }

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
        });

        if (typeof move !== 'number') return;

        const t = window.setTimeout(() => {
            // Re-check basic invariants at execution time.
            setHistory((prevHistory) => {
                // If anything changed meanwhile, don't apply.
                // This is a minimal guard for React StrictMode / rapid resets.
                const last = prevHistory[prevHistory.length - 1];
                const lastBoard = last.board;

                if (getWinner(lastBoard) || isDraw(lastBoard)) return prevHistory;
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
        currentPlayer,
        gameOver,
        humanPlayer,
        isSinglePlayer,
        isViewingLatest,
    ]);

    return (
        <div className="game">
            <div className="modeRow" aria-label="Game mode">
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
            </div>

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
                            'playerBadge ' +
                            (currentPlayer === PLAYERS.X && !gameOver ? 'activeX' : '')
                        }
                    >
                        X
                    </span>
                    <span
                        className={
                            'playerBadge ' +
                            (currentPlayer === PLAYERS.O && !gameOver ? 'activeO' : '')
                        }
                    >
                        O
                    </span>
                </div>
            </div>

            <Board
                board={board}
                onSquareClick={handleSquareClick}
                winningLine={winnerInfo?.line ?? null}
                disabled={gameOver || (isSinglePlayer && currentPlayer === aiPlayer)}
            />

            <div className="controls" aria-label="Game controls">
                <button
                    type="button"
                    className="btn btnGhost"
                    onClick={undoMove}
                    disabled={!canUndo}
                >
                    Undo
                </button>
                <button
                    type="button"
                    className="btn btnGhost"
                    onClick={redoMove}
                    disabled={!canRedo}
                >
                    Redo
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
                                disabled={isSinglePlayer}
                                title={isSinglePlayer ? 'History disabled in AI mode' : undefined}
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
                    ) : (
                        <>
                            Click an empty square to place your mark. You can’t overwrite a filled
                            square.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

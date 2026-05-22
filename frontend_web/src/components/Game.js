import React, { useMemo, useRef, useState } from 'react';
import Board from './Board';
import {
    createEmptyBoard,
    getNextPlayer,
    getWinner,
    isDraw,
    PLAYERS,
} from '../gameLogic';

/**
 * @typedef {{board: (null|'X'|'O')[], moveIndex: number, moveSquareIndex: (number|null), player: ('X'|'O'|null)}} HistoryEntry
 */

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

    const canUndo = stepIndex > 0;
    const canRedo = stepIndex < history.length - 1;

    /**
     * We must update scores exactly once per finished round.
     * Using a ref avoids extra state and prevents double-counting across re-renders.
     *
     * IMPORTANT: We only count a result when viewing the latest step (i.e., not time-traveling).
     * That ensures undo/redo doesn't inflate the scoreboard.
     */
    const hasCountedResultRef = useRef(false);

    if (gameOver && !hasCountedResultRef.current && stepIndex === history.length - 1) {
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
        return `Turn: ${currentPlayer}`;
    }, [currentPlayer, draw, winnerInfo]);

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

    function handleSquareClick(index) {
        if (gameOver) return;
        if (board[index] !== null) return;

        const newBoard = board.slice();
        newBoard[index] = currentPlayer;

        setHistory((prev) => {
            const trimmed = prev.slice(0, stepIndex + 1);
            const nextEntry = {
                board: newBoard,
                moveIndex: trimmed.length,
                moveSquareIndex: index,
                player: currentPlayer,
            };
            return trimmed.concat(nextEntry);
        });
        setStepIndex((prev) => prev + 1);
    }

    function jumpToStep(nextIndex) {
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
        const nextStarter = getNextPlayer(startingPlayer);
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

    return (
        <div className="game">
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
                disabled={gameOver}
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

                <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={resetBoardKeepStarter}
                >
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
                                className={
                                    'historyBtn' + (item.idx === stepIndex ? ' active' : '')
                                }
                                onClick={() => jumpToStep(item.idx)}
                                aria-current={item.idx === stepIndex ? 'step' : undefined}
                            >
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="help">
                <p className="helpText">
                    Click an empty square to place your mark. You can’t overwrite a filled
                    square.
                </p>
            </div>
        </div>
    );
}

import React, { useMemo, useRef, useState } from "react";
import Board from "./Board";
import {
  createEmptyBoard,
  getNextPlayer,
  getWinner,
  isDraw,
  PLAYERS,
} from "../gameLogic";

// PUBLIC_INTERFACE
export default function Game() {
  /** This is the main interactive game component. */
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.X);
  const [startingPlayer, setStartingPlayer] = useState(PLAYERS.X);

  // Persistent-in-session scoreboard (does not reset unless explicitly requested).
  const [scores, setScores] = useState(() => ({
    xWins: 0,
    oWins: 0,
    draws: 0,
  }));

  const winnerInfo = useMemo(() => getWinner(board), [board]);
  const draw = useMemo(() => isDraw(board), [board]);
  const gameOver = Boolean(winnerInfo) || draw;

  /**
   * We must update scores exactly once per finished round.
   * Using a ref avoids extra state and prevents double-counting across re-renders.
   */
  const hasCountedResultRef = useRef(false);

  if (gameOver && !hasCountedResultRef.current) {
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

  function handleSquareClick(index) {
    if (gameOver) return;
    if (board[index] !== null) return;

    setBoard((prev) => {
      const next = prev.slice();
      next[index] = currentPlayer;
      return next;
    });
    setCurrentPlayer((p) => getNextPlayer(p));
  }

  function resetBoardKeepStarter() {
    setBoard(createEmptyBoard());
    setCurrentPlayer(startingPlayer);
    // Allow the next finished round to be counted.
    hasCountedResultRef.current = false;
  }

  function newGameSwapStarter() {
    const nextStarter = getNextPlayer(startingPlayer);
    setStartingPlayer(nextStarter);
    setBoard(createEmptyBoard());
    setCurrentPlayer(nextStarter);
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
              "playerBadge " + (currentPlayer === PLAYERS.X && !gameOver ? "activeX" : "")
            }
          >
            X
          </span>
          <span
            className={
              "playerBadge " + (currentPlayer === PLAYERS.O && !gameOver ? "activeO" : "")
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

      <div className="help">
        <p className="helpText">
          Click an empty square to place your mark. You can’t overwrite a filled square.
        </p>
      </div>
    </div>
  );
}

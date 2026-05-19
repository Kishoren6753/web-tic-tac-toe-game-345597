import React, { useMemo, useState } from "react";
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

  const winnerInfo = useMemo(() => getWinner(board), [board]);
  const draw = useMemo(() => isDraw(board), [board]);
  const gameOver = Boolean(winnerInfo) || draw;

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
  }

  function newGameSwapStarter() {
    const nextStarter = getNextPlayer(startingPlayer);
    setStartingPlayer(nextStarter);
    setBoard(createEmptyBoard());
    setCurrentPlayer(nextStarter);
  }

  return (
    <div className="game">
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

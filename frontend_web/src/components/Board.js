import React from "react";
import Square from "./Square";

/**
 * Render the 3x3 board.
 *
 * @param {{
 *  board: (null|"X"|"O")[],
 *  onSquareClick: (index: number) => void,
 *  winningLine: number[] | null,
 *  disabled: boolean
 * }} props
 */
export default function Board({ board, onSquareClick, winningLine, disabled }) {
  const isWinningIndex = (idx) => (winningLine ? winningLine.includes(idx) : false);

  return (
    <div className="boardWrap">
      <div className="board" role="grid" aria-label="Tic Tac Toe board">
        {board.map((value, idx) => (
          <Square
            key={idx}
            value={value}
            index={idx}
            onClick={() => onSquareClick(idx)}
            highlight={isWinningIndex(idx)}
            disabled={disabled || value !== null}
          />
        ))}
      </div>
    </div>
  );
}

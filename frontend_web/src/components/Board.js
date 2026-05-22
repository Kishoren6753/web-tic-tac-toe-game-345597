import React from 'react';
import Square from './Square';

/**
 * Render an NxN board.
 *
 * @param {{
 *  board: (null|'X'|'O')[],
 *  boardSize: number,
 *  onSquareClick: (index: number) => void,
 *  winningLine: number[] | null,
 *  disabled: boolean
 * }} props
 */
export default function Board({ board, boardSize, onSquareClick, winningLine, disabled }) {
    const isWinningIndex = (idx) => (winningLine ? winningLine.includes(idx) : false);

    return (
        <div className="boardWrap">
            <div
                className="board"
                role="grid"
                aria-label={`Tic Tac Toe board (${boardSize} by ${boardSize})`}
                style={
                    /** @type {React.CSSProperties} */ ({
                        '--boardSize': String(boardSize),
                    })
                }
            >
                {board.map((value, idx) => (
                    <Square
                        key={idx}
                        value={value}
                        index={idx}
                        boardSize={boardSize}
                        onClick={() => onSquareClick(idx)}
                        highlight={isWinningIndex(idx)}
                        disabled={disabled || value !== null}
                    />
                ))}
            </div>
        </div>
    );
}

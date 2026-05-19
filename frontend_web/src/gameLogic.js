/**
 * A small helper module containing game logic functions.
 * Keeping these pure makes them easy to test and reason about.
 */

export const PLAYERS = Object.freeze({
  X: "X",
  O: "O",
});

export const WINNING_LINES = Object.freeze([
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
]);

/**
 * Create an empty 3x3 board represented as a 9-length array.
 */
export function createEmptyBoard() {
  return Array(9).fill(null);
}

/**
 * Returns winner info if the board has a 3-in-a-row.
 *
 * @param {(null|"X"|"O")[]} board
 * @returns {{winner: "X"|"O", line: number[]} | null}
 */
export function getWinner(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const val = board[a];
    if (val && val === board[b] && val === board[c]) {
      return { winner: val, line };
    }
  }
  return null;
}

/**
 * True when all squares are filled and there is no winner.
 *
 * @param {(null|"X"|"O")[]} board
 * @returns {boolean}
 */
export function isDraw(board) {
  return board.every((sq) => sq !== null) && getWinner(board) === null;
}

/**
 * Determine the next player based on current player.
 *
 * @param {"X"|"O"} current
 * @returns {"X"|"O"}
 */
export function getNextPlayer(current) {
  return current === PLAYERS.X ? PLAYERS.O : PLAYERS.X;
}

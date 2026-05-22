/**
 * A small helper module containing game logic functions.
 * Keeping these pure makes them easy to test and reason about.
 */

export const PLAYERS = Object.freeze({
    X: 'X',
    O: 'O',
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

/**
 * Count empty squares.
 *
 * @param {(null|"X"|"O")[]} board
 * @returns {number}
 */
function countEmpty(board) {
    let n = 0;
    for (const v of board) {
        if (v === null) n += 1;
    }
    return n;
}

/**
 * Get list of empty indices.
 *
 * @param {(null|"X"|"O")[]} board
 * @returns {number[]}
 */
export function getAvailableMoves(board) {
    /** @type {number[]} */
    const moves = [];
    for (let i = 0; i < board.length; i += 1) {
        if (board[i] === null) moves.push(i);
    }
    return moves;
}

/**
 * Evaluate board for minimax from the perspective of aiPlayer.
 *
 * @param {(null|"X"|"O")[]} board
 * @param {"X"|"O"} aiPlayer
 * @returns {number} +10 win, -10 loss, 0 draw/unfinished
 */
function evaluateBoard(board, aiPlayer) {
    const winnerInfo = getWinner(board);
    if (!winnerInfo) return 0;

    if (winnerInfo.winner === aiPlayer) return 10;
    return -10;
}

/**
 * Minimax (unbeatable). Uses depth to prefer faster wins / slower losses.
 *
 * @param {(null|"X"|"O")[]} board
 * @param {"X"|"O"} currentPlayer
 * @param {"X"|"O"} aiPlayer
 * @param {number} depth
 * @returns {number}
 */
function minimax(board, currentPlayer, aiPlayer, depth) {
    const score = evaluateBoard(board, aiPlayer);
    if (score !== 0) {
        // Faster win is better; slower loss is better.
        return score > 0 ? score - depth : score + depth;
    }

    if (isDraw(board)) return 0;

    const moves = getAvailableMoves(board);

    // AI tries to maximize; opponent minimizes.
    if (currentPlayer === aiPlayer) {
        let best = -Infinity;
        for (const move of moves) {
            const next = board.slice();
            next[move] = currentPlayer;
            best = Math.max(best, minimax(next, getNextPlayer(currentPlayer), aiPlayer, depth + 1));
        }
        return best;
    }

    let best = Infinity;
    for (const move of moves) {
        const next = board.slice();
        next[move] = currentPlayer;
        best = Math.min(best, minimax(next, getNextPlayer(currentPlayer), aiPlayer, depth + 1));
    }
    return best;
}

/**
 * Find best move for AI (unbeatable).
 *
 * @param {(null|"X"|"O")[]} board
 * @param {"X"|"O"} aiPlayer
 * @returns {number | null}
 */
export function getBestMoveMinimax(board, aiPlayer) {
    if (getWinner(board) || isDraw(board)) return null;

    const moves = getAvailableMoves(board);
    if (moves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
        const next = board.slice();
        next[move] = aiPlayer;

        const score = minimax(next, getNextPlayer(aiPlayer), aiPlayer, 1);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

/**
 * Get a random available move.
 *
 * @param {(null|"X"|"O")[]} board
 * @param {() => number} rng
 * @returns {number | null}
 */
export function getRandomMove(board, rng = Math.random) {
    const moves = getAvailableMoves(board);
    if (moves.length === 0) return null;
    const idx = Math.floor(rng() * moves.length);
    return moves[idx];
}

/**
 * Try to find a move that immediately wins for player.
 *
 * @param {(null|"X"|"O")[]} board
 * @param {"X"|"O"} player
 * @returns {number | null}
 */
export function findImmediateWinningMove(board, player) {
    const moves = getAvailableMoves(board);
    for (const move of moves) {
        const next = board.slice();
        next[move] = player;
        const winnerInfo = getWinner(next);
        if (winnerInfo?.winner === player) return move;
    }
    return null;
}

/**
 * Difficulty labels for single-player mode.
 */
export const AI_DIFFICULTIES = Object.freeze({
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard',
});

/**
 * Get an AI move based on difficulty.
 *
 * Easy: random move.
 * Medium: if can win now, do it; else if must block, block; else random.
 * Hard: minimax (unbeatable).
 *
 * @param {(null|"X"|"O")[]} board
 * @param {{"aiPlayer": "X"|"O", "humanPlayer": "X"|"O", "difficulty": string, "rng"?: () => number}} opts
 * @returns {number | null}
 */
export function getAIMove(board, opts) {
    const { aiPlayer, humanPlayer, difficulty, rng = Math.random } = opts;

    if (getWinner(board) || isDraw(board)) return null;

    if (difficulty === AI_DIFFICULTIES.EASY) {
        return getRandomMove(board, rng);
    }

    if (difficulty === AI_DIFFICULTIES.MEDIUM) {
        const win = findImmediateWinningMove(board, aiPlayer);
        if (typeof win === 'number') return win;

        const block = findImmediateWinningMove(board, humanPlayer);
        if (typeof block === 'number') return block;

        return getRandomMove(board, rng);
    }

    // Default to hard.
    return getBestMoveMinimax(board, aiPlayer);
}

/**
 * Utility to decide a safe default AI difficulty based on game complexity.
 * (Not currently used by UI, but kept as a pure helper for future use.)
 *
 * @param {(null|"X"|"O")[]} board
 * @returns {string}
 */
export function suggestDifficulty(board) {
    const empties = countEmpty(board);
    // Early game: hard is fine; late game: also hard. This exists mainly as an example hook.
    return empties >= 6 ? AI_DIFFICULTIES.MEDIUM : AI_DIFFICULTIES.HARD;
}

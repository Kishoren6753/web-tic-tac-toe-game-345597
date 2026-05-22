/**
 * A small helper module containing game logic functions.
 * Keeping these pure makes them easy to test and reason about.
 */

export const PLAYERS = Object.freeze({
    X: 'X',
    O: 'O',
});

/**
 * Difficulty labels for single-player mode.
 */
export const AI_DIFFICULTIES = Object.freeze({
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard',
});

/**
 * Default game configuration.
 */
export const DEFAULT_GAME_CONFIG = Object.freeze({
    boardSize: 3,
    winLength: 3,
});

/**
 * Validate a game configuration and return a normalized version.
 *
 * Rules:
 * - boardSize: integer between 3 and 8 (UI constrains further to 3..5, but logic is safe).
 * - winLength: integer between 3 and boardSize.
 *
 * @param {{boardSize: number, winLength: number}} config
 * @returns {{boardSize: number, winLength: number}}
 */
export function normalizeGameConfig(config) {
    const rawBoardSize = Number(config?.boardSize);
    const rawWinLength = Number(config?.winLength);

    const boardSize = Number.isFinite(rawBoardSize) ? Math.floor(rawBoardSize) : DEFAULT_GAME_CONFIG.boardSize;
    const boundedBoardSize = Math.max(3, Math.min(8, boardSize));

    const winLength = Number.isFinite(rawWinLength) ? Math.floor(rawWinLength) : DEFAULT_GAME_CONFIG.winLength;
    const boundedWinLength = Math.max(3, Math.min(boundedBoardSize, winLength));

    return {
        boardSize: boundedBoardSize,
        winLength: boundedWinLength,
    };
}

/**
 * Create an empty NxN board represented as a length (boardSize * boardSize) array.
 *
 * @param {number=} boardSize
 * @returns {(null|'X'|'O')[]}
 */
export function createEmptyBoard(boardSize = DEFAULT_GAME_CONFIG.boardSize) {
    const size = Math.max(3, Math.floor(Number(boardSize) || DEFAULT_GAME_CONFIG.boardSize));
    return Array(size * size).fill(null);
}

/**
 * Get row/col coordinates from a linear index.
 *
 * @param {number} index
 * @param {number} boardSize
 * @returns {{row: number, col: number}}
 */
function indexToCoord(index, boardSize) {
    const row = Math.floor(index / boardSize);
    const col = index % boardSize;
    return { row, col };
}

/**
 * Convert row/col coordinates to a linear index.
 *
 * @param {number} row
 * @param {number} col
 * @param {number} boardSize
 * @returns {number}
 */
function coordToIndex(row, col, boardSize) {
    return row * boardSize + col;
}

/**
 * Generate all winning line index arrays for an NxN board and winLength K.
 * Lines include horizontals, verticals, and diagonals (both directions).
 *
 * @param {number} boardSize
 * @param {number} winLength
 * @returns {number[][]}
 */
export function generateWinningLines(boardSize, winLength) {
    const cfg = normalizeGameConfig({ boardSize, winLength });
    const n = cfg.boardSize;
    const k = cfg.winLength;

    /** @type {number[][]} */
    const lines = [];

    // Horizontal segments
    for (let r = 0; r < n; r += 1) {
        for (let c = 0; c <= n - k; c += 1) {
            /** @type {number[]} */
            const line = [];
            for (let i = 0; i < k; i += 1) {
                line.push(coordToIndex(r, c + i, n));
            }
            lines.push(line);
        }
    }

    // Vertical segments
    for (let c = 0; c < n; c += 1) {
        for (let r = 0; r <= n - k; r += 1) {
            /** @type {number[]} */
            const line = [];
            for (let i = 0; i < k; i += 1) {
                line.push(coordToIndex(r + i, c, n));
            }
            lines.push(line);
        }
    }

    // Diagonal down-right
    for (let r = 0; r <= n - k; r += 1) {
        for (let c = 0; c <= n - k; c += 1) {
            /** @type {number[]} */
            const line = [];
            for (let i = 0; i < k; i += 1) {
                line.push(coordToIndex(r + i, c + i, n));
            }
            lines.push(line);
        }
    }

    // Diagonal down-left
    for (let r = 0; r <= n - k; r += 1) {
        for (let c = k - 1; c < n; c += 1) {
            /** @type {number[]} */
            const line = [];
            for (let i = 0; i < k; i += 1) {
                line.push(coordToIndex(r + i, c - i, n));
            }
            lines.push(line);
        }
    }

    return lines;
}

/**
 * Returns winner info if the board has a winLength-in-a-row.
 *
 * @param {(null|'X'|'O')[]} board
 * @param {{boardSize: number, winLength: number}} config
 * @returns {{winner: 'X'|'O', line: number[]} | null}
 */
export function getWinner(board, config) {
    const cfg = normalizeGameConfig(config);
    const winningLines = generateWinningLines(cfg.boardSize, cfg.winLength);

    for (const line of winningLines) {
        const first = board[line[0]];
        if (!first) continue;

        let ok = true;
        for (let i = 1; i < line.length; i += 1) {
            if (board[line[i]] !== first) {
                ok = false;
                break;
            }
        }
        if (ok) {
            return { winner: first, line };
        }
    }

    return null;
}

/**
 * True when all squares are filled and there is no winner.
 *
 * @param {(null|'X'|'O')[]} board
 * @param {{boardSize: number, winLength: number}} config
 * @returns {boolean}
 */
export function isDraw(board, config) {
    return board.every((sq) => sq !== null) && getWinner(board, config) === null;
}

/**
 * Determine the next player based on current player.
 *
 * @param {'X'|'O'} current
 * @returns {'X'|'O'}
 */
export function getNextPlayer(current) {
    return current === PLAYERS.X ? PLAYERS.O : PLAYERS.X;
}

/**
 * Get list of empty indices.
 *
 * @param {(null|'X'|'O')[]} board
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
 * Get a random available move.
 *
 * @param {(null|'X'|'O')[]} board
 * @param {() => number=} rng
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
 * @param {(null|'X'|'O')[]} board
 * @param {'X'|'O'} player
 * @param {{boardSize: number, winLength: number}} config
 * @returns {number | null}
 */
export function findImmediateWinningMove(board, player, config) {
    const moves = getAvailableMoves(board);
    for (const move of moves) {
        const next = board.slice();
        next[move] = player;
        const winnerInfo = getWinner(next, config);
        if (winnerInfo?.winner === player) return move;
    }
    return null;
}

/**
 * Evaluate board for minimax from the perspective of aiPlayer.
 *
 * @param {(null|'X'|'O')[]} board
 * @param {'X'|'O'} aiPlayer
 * @param {{boardSize: number, winLength: number}} config
 * @returns {number} +10 win, -10 loss, 0 draw/unfinished
 */
function evaluateBoard(board, aiPlayer, config) {
    const winnerInfo = getWinner(board, config);
    if (!winnerInfo) return 0;

    if (winnerInfo.winner === aiPlayer) return 10;
    return -10;
}

/**
 * Minimax (unbeatable) for small boards only.
 * Uses depth to prefer faster wins / slower losses.
 *
 * NOTE: This is intentionally used only for classic 3x3 with winLength=3.
 *
 * @param {(null|'X'|'O')[]} board
 * @param {'X'|'O'} currentPlayer
 * @param {'X'|'O'} aiPlayer
 * @param {number} depth
 * @param {{boardSize: number, winLength: number}} config
 * @returns {number}
 */
function minimax(board, currentPlayer, aiPlayer, depth, config) {
    const score = evaluateBoard(board, aiPlayer, config);
    if (score !== 0) {
        // Faster win is better; slower loss is better.
        return score > 0 ? score - depth : score + depth;
    }

    if (isDraw(board, config)) return 0;

    const moves = getAvailableMoves(board);

    // AI tries to maximize; opponent minimizes.
    if (currentPlayer === aiPlayer) {
        let best = -Infinity;
        for (const move of moves) {
            const next = board.slice();
            next[move] = currentPlayer;
            best = Math.max(best, minimax(next, getNextPlayer(currentPlayer), aiPlayer, depth + 1, config));
        }
        return best;
    }

    let best = Infinity;
    for (const move of moves) {
        const next = board.slice();
        next[move] = currentPlayer;
        best = Math.min(best, minimax(next, getNextPlayer(currentPlayer), aiPlayer, depth + 1, config));
    }
    return best;
}

/**
 * Find best move for AI (unbeatable) on classic 3x3 only.
 *
 * @param {(null|'X'|'O')[]} board
 * @param {'X'|'O'} aiPlayer
 * @param {{boardSize: number, winLength: number}} config
 * @returns {number | null}
 */
export function getBestMoveMinimax(board, aiPlayer, config) {
    if (getWinner(board, config) || isDraw(board, config)) return null;

    const moves = getAvailableMoves(board);
    if (moves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
        const next = board.slice();
        next[move] = aiPlayer;

        const score = minimax(next, getNextPlayer(aiPlayer), aiPlayer, 1, config);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

/**
 * Get an AI move based on difficulty and config.
 *
 * Easy: random move.
 * Medium: if can win now, do it; else if must block, block; else random.
 * Hard:
 *  - for classic 3x3 with K=3: minimax
 *  - otherwise: same as Medium (keeps game responsive for larger boards)
 *
 * @param {(null|'X'|'O')[]} board
 * @param {{
 *  aiPlayer: 'X'|'O',
 *  humanPlayer: 'X'|'O',
 *  difficulty: string,
 *  rng?: () => number,
 *  config: {boardSize: number, winLength: number}
 * }} opts
 * @returns {number | null}
 */
export function getAIMove(board, opts) {
    const { aiPlayer, humanPlayer, difficulty, rng = Math.random, config } = opts;

    if (getWinner(board, config) || isDraw(board, config)) return null;

    if (difficulty === AI_DIFFICULTIES.EASY) {
        return getRandomMove(board, rng);
    }

    if (difficulty === AI_DIFFICULTIES.MEDIUM) {
        const win = findImmediateWinningMove(board, aiPlayer, config);
        if (typeof win === 'number') return win;

        const block = findImmediateWinningMove(board, humanPlayer, config);
        if (typeof block === 'number') return block;

        return getRandomMove(board, rng);
    }

    // HARD: minimax only for the classic game to avoid exponential blow-ups.
    const normalized = normalizeGameConfig(config);
    const isClassic = normalized.boardSize === 3 && normalized.winLength === 3;

    if (isClassic) {
        return getBestMoveMinimax(board, aiPlayer, normalized);
    }

    // Fall back to "Medium" strategy for larger configs.
    const win = findImmediateWinningMove(board, aiPlayer, normalized);
    if (typeof win === 'number') return win;

    const block = findImmediateWinningMove(board, humanPlayer, normalized);
    if (typeof block === 'number') return block;

    return getRandomMove(board, rng);
}

/**
 * Suggest the best move for a given player.
 *
 * Strategy:
 * 1) If the player can win immediately, suggest that move.
 * 2) If the opponent can win immediately next turn, suggest a blocking move.
 * 3) Otherwise, fall back to a minimax best-move for classic 3x3 (k=3),
 *    or center preference on larger boards, else random.
 *
 * This is used by the UI "Hint" feature (not by the AI opponent logic).
 *
 * @param {(null|'X'|'O')[]} board
 * @param {{
 *  player: 'X'|'O',
 *  config: {boardSize: number, winLength: number},
 *  rng?: () => number
 * }} opts
 * @returns {number | null}
 */
export function getHintMove(board, opts) {
    const { player, config, rng = Math.random } = opts;
    const normalized = normalizeGameConfig(config);

    if (getWinner(board, normalized) || isDraw(board, normalized)) return null;

    const opponent = getNextPlayer(player);

    // Win now if possible.
    const win = findImmediateWinningMove(board, player, normalized);
    if (typeof win === 'number') return win;

    // Otherwise block opponent's immediate win.
    const block = findImmediateWinningMove(board, opponent, normalized);
    if (typeof block === 'number') return block;

    // Classic: use minimax for strongest hint.
    const isClassic = normalized.boardSize === 3 && normalized.winLength === 3;
    if (isClassic) return getBestMoveMinimax(board, player, normalized);

    // Prefer center if available for larger boards (good general heuristic).
    const n = normalized.boardSize;
    const center = Math.floor((n * n) / 2);
    if (Number.isInteger(center) && board[center] === null) return center;

    return getRandomMove(board, rng);
}

/**
 * Utility to format a square label as 1-based row/col for UI/History.
 *
 * @param {number} index
 * @param {number} boardSize
 * @returns {string}
 */
export function formatSquarePosition(index, boardSize) {
    const n = Math.max(3, Math.floor(Number(boardSize) || DEFAULT_GAME_CONFIG.boardSize));
    const { row, col } = indexToCoord(index, n);
    return `r${row + 1}c${col + 1}`;
}

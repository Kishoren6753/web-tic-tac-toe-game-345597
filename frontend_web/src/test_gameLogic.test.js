import {
    AI_DIFFICULTIES,
    PLAYERS,
    createEmptyBoard,
    findImmediateWinningMove,
    generateWinningLines,
    getAIMove,
    getAvailableMoves,
    getBestMoveMinimax,
    getNextPlayer,
    getWinner,
    getRandomMove,
    hasTimeExpired,
    isDraw,
    formatMsAsClock,
    normalizeGameConfig,
    normalizeTimeControlSeconds,
} from './gameLogic';

describe('gameLogic', () => {
    describe('normalizeGameConfig', () => {
        it('bounds winLength between 3 and boardSize', () => {
            expect(normalizeGameConfig({ boardSize: 5, winLength: 99 })).toEqual({
                boardSize: 5,
                winLength: 5,
            });

            expect(normalizeGameConfig({ boardSize: 4, winLength: 2 })).toEqual({
                boardSize: 4,
                winLength: 3,
            });
        });
    });

    describe('createEmptyBoard', () => {
        it('creates a 3x3 board by default', () => {
            const board = createEmptyBoard();
            expect(board).toHaveLength(9);
            expect(board.every((x) => x === null)).toBe(true);
        });

        it('creates an NxN board when boardSize is provided', () => {
            const board = createEmptyBoard(4);
            expect(board).toHaveLength(16);
            expect(board.every((x) => x === null)).toBe(true);
        });

        it('returns a new array each time (no shared reference)', () => {
            const a = createEmptyBoard();
            const b = createEmptyBoard();
            expect(a).not.toBe(b);
        });
    });

    describe('getNextPlayer', () => {
        it('toggles X -> O', () => {
            expect(getNextPlayer(PLAYERS.X)).toBe(PLAYERS.O);
        });

        it('toggles O -> X', () => {
            expect(getNextPlayer(PLAYERS.O)).toBe(PLAYERS.X);
        });
    });

    describe('generateWinningLines', () => {
        it('generates 8 lines for classic 3x3 k=3 (same count as standard tic-tac-toe)', () => {
            const lines = generateWinningLines(3, 3);
            expect(lines).toHaveLength(8);
        });

        it('generates lines of correct length for 5x5 k=4', () => {
            const lines = generateWinningLines(5, 4);
            expect(lines.length).toBeGreaterThan(0);
            expect(lines.every((l) => l.length === 4)).toBe(true);
        });
    });

    describe('getWinner (dynamic)', () => {
        it('returns null for an empty board (3x3)', () => {
            const config = { boardSize: 3, winLength: 3 };
            expect(getWinner(createEmptyBoard(3), config)).toBeNull();
        });

        it('detects a winner on a row (4x4, k=4)', () => {
            const config = { boardSize: 4, winLength: 4 };
            const board = createEmptyBoard(4);
            board[4] = 'X';
            board[5] = 'X';
            board[6] = 'X';
            board[7] = 'X';

            expect(getWinner(board, config)).toEqual({ winner: 'X', line: [4, 5, 6, 7] });
        });

        it('detects a winner on a column (5x5, k=4)', () => {
            const config = { boardSize: 5, winLength: 4 };
            const board = createEmptyBoard(5);

            // Column 2 (0-based col=1), rows 1..4 (0-based r=1..4) but k=4: r=1..4 => indices: 6,11,16,21
            board[6] = 'O';
            board[11] = 'O';
            board[16] = 'O';
            board[21] = 'O';

            expect(getWinner(board, config)).toEqual({ winner: 'O', line: [6, 11, 16, 21] });
        });

        it('detects a winner on a diagonal (4x4, k=3)', () => {
            const config = { boardSize: 4, winLength: 3 };
            const board = createEmptyBoard(4);

            // Down-right diagonal segment starting at (row=0,col=1): indices 1,6,11
            board[1] = 'X';
            board[6] = 'X';
            board[11] = 'X';

            expect(getWinner(board, config)).toEqual({ winner: 'X', line: [1, 6, 11] });
        });
    });

    describe('isDraw (dynamic)', () => {
        it('is false when the board is not full', () => {
            const config = { boardSize: 3, winLength: 3 };
            const board = createEmptyBoard(3);
            board[0] = 'X';
            expect(isDraw(board, config)).toBe(false);
        });

        it('is true when the board is full and there is no winner (3x3 classic)', () => {
            const config = { boardSize: 3, winLength: 3 };
            const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
            expect(getWinner(board, config)).toBeNull();
            expect(isDraw(board, config)).toBe(true);
        });
    });

    describe('AI helpers', () => {
        it('getAvailableMoves returns all empty indices (4x4)', () => {
            const board = createEmptyBoard(4);
            board[0] = 'X';
            board[5] = 'O';
            const moves = getAvailableMoves(board);
            expect(moves.includes(0)).toBe(false);
            expect(moves.includes(5)).toBe(false);
            expect(moves.length).toBe(14);
        });

        it('getRandomMove returns null when no moves left (3x3)', () => {
            const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
            expect(getRandomMove(board, () => 0.5)).toBeNull();
        });

        it('findImmediateWinningMove finds a direct win (4x4, k=4)', () => {
            const config = { boardSize: 4, winLength: 4 };

            // X can win by playing index 3 to complete [0,1,2,3]
            const board = createEmptyBoard(4);
            board[0] = 'X';
            board[1] = 'X';
            board[2] = 'X';
            board[3] = null;

            expect(findImmediateWinningMove(board, 'X', config)).toBe(3);
        });

        it('getAIMove (Medium) blocks immediate opponent win (4x4, k=4)', () => {
            const config = { boardSize: 4, winLength: 4 };

            // X about to win at index 3; O must block at 3
            const board = createEmptyBoard(4);
            board[0] = 'X';
            board[1] = 'X';
            board[2] = 'X';

            const move = getAIMove(board, {
                aiPlayer: 'O',
                humanPlayer: 'X',
                difficulty: AI_DIFFICULTIES.MEDIUM,
                rng: () => 0,
                config,
            });
            expect(move).toBe(3);
        });

        it('getBestMoveMinimax returns null on finished games (classic)', () => {
            const config = { boardSize: 3, winLength: 3 };

            const wonBoard = ['X', 'X', 'X', null, 'O', null, null, null, 'O'];
            expect(getBestMoveMinimax(wonBoard, 'O', config)).toBeNull();

            const drawBoard = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
            expect(getBestMoveMinimax(drawBoard, 'O', config)).toBeNull();
        });

        it('getAIMove (Hard) returns a legal move on a non-terminal board (classic)', () => {
            const config = { boardSize: 3, winLength: 3 };

            const board = ['X', null, null, null, 'O', null, null, null, null];
            const move = getAIMove(board, {
                aiPlayer: 'O',
                humanPlayer: 'X',
                difficulty: AI_DIFFICULTIES.HARD,
                config,
            });
            expect(typeof move === 'number').toBe(true);
            expect(move).toBeGreaterThanOrEqual(0);
            expect(move).toBeLessThan(9);
            expect(board[move]).toBeNull();
        });

        it('getAIMove (Hard) falls back to a legal move for larger boards', () => {
            const config = { boardSize: 5, winLength: 4 };
            const board = createEmptyBoard(5);
            board[0] = 'X';
            board[6] = 'O';

            const move = getAIMove(board, {
                aiPlayer: 'O',
                humanPlayer: 'X',
                difficulty: AI_DIFFICULTIES.HARD,
                rng: () => 0,
                config,
            });

            expect(typeof move === 'number').toBe(true);
            expect(move).toBeGreaterThanOrEqual(0);
            expect(move).toBeLessThan(25);
            expect(board[move]).toBeNull();
        });
    });

    describe('timed turns helpers', () => {
        it('formatMsAsClock formats mm:ss and clamps negative to 0', () => {
            expect(formatMsAsClock(0)).toBe('0:00');
            expect(formatMsAsClock(999)).toBe('0:00');
            expect(formatMsAsClock(1000)).toBe('0:01');
            expect(formatMsAsClock(61000)).toBe('1:01');
            expect(formatMsAsClock(-500)).toBe('0:00');
        });

        it('normalizeTimeControlSeconds clamps into [5, 600]', () => {
            expect(normalizeTimeControlSeconds(1)).toBe(5);
            expect(normalizeTimeControlSeconds(5)).toBe(5);
            expect(normalizeTimeControlSeconds(30)).toBe(30);
            expect(normalizeTimeControlSeconds(9999)).toBe(600);
        });

        it('hasTimeExpired is true when remaining is <= 0', () => {
            expect(hasTimeExpired(0)).toBe(true);
            expect(hasTimeExpired(-1)).toBe(true);
            expect(hasTimeExpired(1)).toBe(false);
        });
    });
});

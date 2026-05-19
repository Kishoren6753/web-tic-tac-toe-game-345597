import {
  PLAYERS,
  WINNING_LINES,
  createEmptyBoard,
  getNextPlayer,
  getWinner,
  isDraw,
} from "./gameLogic";

describe("gameLogic", () => {
  describe("createEmptyBoard", () => {
    it("creates a 9-length board filled with nulls", () => {
      const board = createEmptyBoard();
      expect(board).toHaveLength(9);
      expect(board.every((x) => x === null)).toBe(true);
    });

    it("returns a new array each time (no shared reference)", () => {
      const a = createEmptyBoard();
      const b = createEmptyBoard();
      expect(a).not.toBe(b);
    });
  });

  describe("getNextPlayer", () => {
    it("toggles X -> O", () => {
      expect(getNextPlayer(PLAYERS.X)).toBe(PLAYERS.O);
    });

    it("toggles O -> X", () => {
      expect(getNextPlayer(PLAYERS.O)).toBe(PLAYERS.X);
    });
  });

  describe("getWinner", () => {
    it("returns null for an empty board", () => {
      expect(getWinner(createEmptyBoard())).toBeNull();
    });

    it("detects a winner on a row", () => {
      const board = createEmptyBoard();
      board[0] = "X";
      board[1] = "X";
      board[2] = "X";

      expect(getWinner(board)).toEqual({ winner: "X", line: [0, 1, 2] });
    });

    it("detects a winner on a column", () => {
      const board = createEmptyBoard();
      board[0] = "O";
      board[3] = "O";
      board[6] = "O";

      expect(getWinner(board)).toEqual({ winner: "O", line: [0, 3, 6] });
    });

    it("detects a winner on a diagonal", () => {
      const board = createEmptyBoard();
      board[0] = "X";
      board[4] = "X";
      board[8] = "X";

      expect(getWinner(board)).toEqual({ winner: "X", line: [0, 4, 8] });
    });

    it("returns a line that is one of the declared WINNING_LINES", () => {
      const board = createEmptyBoard();
      board[2] = "O";
      board[4] = "O";
      board[6] = "O";

      const winnerInfo = getWinner(board);
      expect(winnerInfo).not.toBeNull();
      expect(winnerInfo.winner).toBe("O");

      const hasLine = WINNING_LINES.some(
        (line) => JSON.stringify(line) === JSON.stringify(winnerInfo.line)
      );
      expect(hasLine).toBe(true);
    });
  });

  describe("isDraw", () => {
    it("is false when the board is not full", () => {
      const board = createEmptyBoard();
      board[0] = "X";
      expect(isDraw(board)).toBe(false);
    });

    it("is false when there is a winner even if the board is full", () => {
      // A full board with a winner (top row X)
      const board = [
        "X",
        "X",
        "X",
        "O",
        "O",
        "X",
        "O",
        "X",
        "O",
      ];
      expect(getWinner(board)).toEqual({ winner: "X", line: [0, 1, 2] });
      expect(isDraw(board)).toBe(false);
    });

    it("is true when the board is full and there is no winner", () => {
      // Classic draw position (no 3-in-a-row)
      const board = [
        "X",
        "O",
        "X",
        "X",
        "O",
        "O",
        "O",
        "X",
        "X",
      ];
      expect(getWinner(board)).toBeNull();
      expect(isDraw(board)).toBe(true);
    });
  });
});

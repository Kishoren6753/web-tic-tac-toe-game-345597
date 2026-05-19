import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Game from "./components/Game";

function clickSquare(n) {
  // Squares are labeled "Square {index+1}, {empty|X|O}"
  const btn = screen.getByLabelText(new RegExp(`^Square ${n},`, "i"));
  fireEvent.click(btn);
  return btn;
}

describe("Game UI interactions", () => {
  it("starts with Turn: X and alternates turns on valid moves", () => {
    render(<Game />);

    expect(screen.getByText("Turn: X")).toBeInTheDocument();

    clickSquare(1); // X
    expect(screen.getByText("Turn: O")).toBeInTheDocument();

    clickSquare(2); // O
    expect(screen.getByText("Turn: X")).toBeInTheDocument();
  });

  it("prevents overwriting an already-filled square", () => {
    render(<Game />);

    clickSquare(1); // X at square 1
    expect(screen.getByLabelText(/Square 1, X/i)).toBeInTheDocument();
    expect(screen.getByText("Turn: O")).toBeInTheDocument();

    // Attempt overwrite: click square 1 again (should be disabled by Board/Square)
    fireEvent.click(screen.getByLabelText(/Square 1, X/i));

    // Turn should remain O (no state change)
    expect(screen.getByText("Turn: O")).toBeInTheDocument();

    // Square should still be X
    expect(screen.getByLabelText(/Square 1, X/i)).toBeInTheDocument();
  });

  it("announces a winner and stops accepting moves after game over", () => {
    render(<Game />);

    // X wins top row: 1,2,3 with O playing 4 and 5 in between.
    clickSquare(1); // X
    clickSquare(4); // O
    clickSquare(2); // X
    clickSquare(5); // O
    clickSquare(3); // X => win

    expect(screen.getByText("Winner: X")).toBeInTheDocument();

    // After winner, board is disabled; verify no further move can be made.
    // Square 6 should still be empty and remain empty after click attempt.
    expect(screen.getByLabelText(/Square 6, empty/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Square 6, empty/i));
    expect(screen.getByLabelText(/Square 6, empty/i)).toBeInTheDocument();
  });

  it("Reset Board clears the board and keeps the starting player", () => {
    render(<Game />);

    // Make a couple of moves first
    clickSquare(1); // X
    clickSquare(2); // O
    expect(screen.getByLabelText(/Square 1, X/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Square 2, O/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset Board/i }));

    // All squares should be empty again; turn should be X (starting player default)
    expect(screen.getByText("Turn: X")).toBeInTheDocument();
    expect(screen.getByLabelText(/Square 1, empty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Square 2, empty/i)).toBeInTheDocument();
  });

  it("New Game (swap starter) swaps the starting player and clears the board", () => {
    render(<Game />);

    // Default starting player is X
    expect(screen.getByText("Turn: X")).toBeInTheDocument();

    // Play one move, then new game should swap starter to O and clear board
    clickSquare(1); // X
    expect(screen.getByLabelText(/Square 1, X/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /New Game \(swap starter\)/i })
    );

    expect(screen.getByText("Turn: O")).toBeInTheDocument();
    expect(screen.getByLabelText(/Square 1, empty/i)).toBeInTheDocument();

    // Ensure the next click places O (since it is now the starter)
    clickSquare(1);
    expect(screen.getByLabelText(/Square 1, O/i)).toBeInTheDocument();
  });
});

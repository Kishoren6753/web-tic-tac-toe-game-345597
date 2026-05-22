import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Game from './components/Game';

function clickSquare(n) {
    // Squares are labeled "Square {index+1}, {empty|X|O}"
    const btn = screen.getByLabelText(new RegExp(`^Square ${n},`, 'i'));
    fireEvent.click(btn);
    return btn;
}

describe('Game UI interactions', () => {
    it('starts with Turn: X and alternates turns on valid moves', () => {
        render(<Game />);

        expect(screen.getByText('Turn: X')).toBeTruthy();

        clickSquare(1); // X
        expect(screen.getByText('Turn: O')).toBeTruthy();

        clickSquare(2); // O
        expect(screen.getByText('Turn: X')).toBeTruthy();
    });

    it('prevents overwriting an already-filled square', () => {
        render(<Game />);

        clickSquare(1); // X at square 1
        expect(screen.getByLabelText(/Square 1, X/i)).toBeTruthy();
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Attempt overwrite: click square 1 again (should be disabled by Board/Square)
        fireEvent.click(screen.getByLabelText(/Square 1, X/i));

        // Turn should remain O (no state change)
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Square should still be X
        expect(screen.getByLabelText(/Square 1, X/i)).toBeTruthy();
    });

    it('announces a winner and stops accepting moves after game over', () => {
        render(<Game />);

        // X wins top row: 1,2,3 with O playing 4 and 5 in between.
        clickSquare(1); // X
        clickSquare(4); // O
        clickSquare(2); // X
        clickSquare(5); // O
        clickSquare(3); // X => win

        expect(screen.getByText('Winner: X')).toBeTruthy();

        // After winner, board is disabled; verify no further move can be made.
        // Square 6 should still be empty and remain empty after click attempt.
        expect(screen.getByLabelText(/Square 6, empty/i)).toBeTruthy();
        fireEvent.click(screen.getByLabelText(/Square 6, empty/i));
        expect(screen.getByLabelText(/Square 6, empty/i)).toBeTruthy();
    });

    it('Reset Board clears the board and keeps the starting player', () => {
        render(<Game />);

        // Make a couple of moves first
        clickSquare(1); // X
        clickSquare(2); // O
        expect(screen.getByLabelText(/Square 1, X/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square 2, O/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Reset Board/i }));

        // All squares should be empty again; turn should be X (starting player default)
        expect(screen.getByText('Turn: X')).toBeTruthy();
        expect(screen.getByLabelText(/Square 1, empty/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square 2, empty/i)).toBeTruthy();
    });

    it('New Game (swap starter) swaps the starting player and clears the board', () => {
        render(<Game />);

        // Default starting player is X
        expect(screen.getByText('Turn: X')).toBeTruthy();

        // Play one move, then new game should swap starter to O and clear board
        clickSquare(1); // X
        expect(screen.getByLabelText(/Square 1, X/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /New Game \(swap starter\)/i }));

        expect(screen.getByText('Turn: O')).toBeTruthy();
        expect(screen.getByLabelText(/Square 1, empty/i)).toBeTruthy();

        // Ensure the next click places O (since it is now the starter)
        clickSquare(1);
        expect(screen.getByLabelText(/Square 1, O/i)).toBeTruthy();
    });

    it('supports undo/redo and updates the board/turn accordingly', () => {
        render(<Game />);

        const undo = screen.getByRole('button', { name: /Undo/i });
        const redo = screen.getByRole('button', { name: /Redo/i });

        // Initially cannot undo/redo
        expect(undo).toBeDisabled();
        expect(redo).toBeDisabled();

        clickSquare(1); // X
        clickSquare(2); // O

        expect(screen.getByLabelText(/Square 1, X/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square 2, O/i)).toBeTruthy();
        expect(screen.getByText('Turn: X')).toBeTruthy();

        // Undo should remove O move (square 2), current turn should become O (to replay that move)
        fireEvent.click(undo);
        expect(screen.getByLabelText(/Square 2, empty/i)).toBeTruthy();
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Redo should re-apply O move and bring turn back to X
        fireEvent.click(redo);
        expect(screen.getByLabelText(/Square 2, O/i)).toBeTruthy();
        expect(screen.getByText('Turn: X')).toBeTruthy();
    });

    it('time travel via move history and truncates future moves when making a new move', () => {
        render(<Game />);

        clickSquare(1); // X
        clickSquare(2); // O
        clickSquare(3); // X

        // Jump back to move #1 (after X @ 1)
        fireEvent.click(screen.getByRole('button', { name: /Go to move #1/i }));
        expect(screen.getByLabelText(/Square 1, X/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square 2, empty/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square 3, empty/i)).toBeTruthy();
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Make a new move from this point, which should truncate previous future
        clickSquare(9); // O at square 9

        // There should no longer be a "move #3" button (history was truncated then extended)
        expect(screen.queryByRole('button', { name: /Go to move #3/i })).toBeNull();

        // And the newly placed mark should be present
        expect(screen.getByLabelText(/Square 9, O/i)).toBeTruthy();
    });
});

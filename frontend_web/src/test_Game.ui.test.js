import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './components/Game';

function clickSquare(pos) {
    // Squares are labeled "Square r{row}c{col}, {empty|X|O}"
    const btn = screen.getByLabelText(new RegExp(`^Square ${pos},`, 'i'));
    fireEvent.click(btn);
    return btn;
}

function setModeToLocal() {
    fireEvent.change(screen.getByLabelText(/Select game mode/i), {
        target: { value: 'Local (2 players)' },
    });
}

function setModeToAI() {
    fireEvent.change(screen.getByLabelText(/Select game mode/i), {
        target: { value: 'Single-player vs AI' },
    });
}

describe('Game UI interactions', () => {
    it('renders configuration controls (board size and win length)', () => {
        render(<Game />);
        expect(screen.getByLabelText(/Select board size/i)).toBeTruthy();
        expect(screen.getByLabelText(/Select win length/i)).toBeTruthy();
    });

    it('starts in local mode with Turn: X and alternates turns on valid moves', () => {
        render(<Game />);

        setModeToLocal();

        expect(screen.getByText('Turn: X')).toBeTruthy();

        clickSquare('r1c1'); // X
        expect(screen.getByText('Turn: O')).toBeTruthy();

        clickSquare('r1c2'); // O
        expect(screen.getByText('Turn: X')).toBeTruthy();
    });

    it('prevents overwriting an already-filled square', () => {
        render(<Game />);

        setModeToLocal();

        clickSquare('r1c1'); // X at r1c1
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Attempt overwrite: click square again (should be disabled by Board/Square)
        fireEvent.click(screen.getByLabelText(/Square r1c1, X/i));

        // Turn should remain O (no state change)
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Square should still be X
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();
    });

    it('announces a winner and stops accepting moves after game over (3x3 default)', () => {
        render(<Game />);

        setModeToLocal();

        // X wins top row: r1c1,r1c2,r1c3 with O playing r2c1 and r2c2 in between.
        clickSquare('r1c1'); // X
        clickSquare('r2c1'); // O
        clickSquare('r1c2'); // X
        clickSquare('r2c2'); // O
        clickSquare('r1c3'); // X => win

        expect(screen.getByText('Winner: X')).toBeTruthy();

        // After winner, board is disabled; verify no further move can be made.
        // r2c3 should still be empty and remain empty after click attempt.
        expect(screen.getByLabelText(/Square r2c3, empty/i)).toBeTruthy();
        fireEvent.click(screen.getByLabelText(/Square r2c3, empty/i));
        expect(screen.getByLabelText(/Square r2c3, empty/i)).toBeTruthy();
    });

    it('Reset Board clears the board and keeps the starting player', () => {
        render(<Game />);

        setModeToLocal();

        // Make a couple of moves first
        clickSquare('r1c1'); // X
        clickSquare('r1c2'); // O
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c2, O/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Reset Board/i }));

        // All squares should be empty again; turn should be X (starting player default)
        expect(screen.getByText('Turn: X')).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c1, empty/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c2, empty/i)).toBeTruthy();
    });

    it('New Game (swap starter) swaps the starting player and clears the board (local mode)', () => {
        render(<Game />);

        setModeToLocal();

        // Default starting player is X
        expect(screen.getByText('Turn: X')).toBeTruthy();

        // Play one move, then new game should swap starter to O and clear board
        clickSquare('r1c1'); // X
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /New Game \(swap starter\)/i }));

        expect(screen.getByText('Turn: O')).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c1, empty/i)).toBeTruthy();

        // Ensure the next click places O (since it is now the starter)
        clickSquare('r1c1');
        expect(screen.getByLabelText(/Square r1c1, O/i)).toBeTruthy();
    });

    it('supports undo/redo in local mode and updates the board/turn accordingly', () => {
        render(<Game />);

        setModeToLocal();

        const undo = screen.getByRole('button', { name: /Undo/i });
        const redo = screen.getByRole('button', { name: /Redo/i });

        // Initially cannot undo/redo
        expect(undo).toBeDisabled();
        expect(redo).toBeDisabled();

        clickSquare('r1c1'); // X
        clickSquare('r1c2'); // O

        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c2, O/i)).toBeTruthy();
        expect(screen.getByText('Turn: X')).toBeTruthy();

        // Undo should remove O move (r1c2), current turn should become O (to replay that move)
        fireEvent.click(undo);
        expect(screen.getByLabelText(/Square r1c2, empty/i)).toBeTruthy();
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Redo should re-apply O move and bring turn back to X
        fireEvent.click(redo);
        expect(screen.getByLabelText(/Square r1c2, O/i)).toBeTruthy();
        expect(screen.getByText('Turn: X')).toBeTruthy();
    });

    it('Hint suggests a move for the current player in local mode (shows a hint message)', () => {
        render(<Game />);
        setModeToLocal();

        const hintBtn = screen.getByRole('button', { name: /Hint/i });
        expect(hintBtn).toBeEnabled();

        fireEvent.click(hintBtn);

        // The exact square can vary, but it must show "Hint: X → rNcM"
        expect(screen.getByText(/Hint:\s*X\s*→\s*r\d+c\d+/i)).toBeTruthy();
    });

    it('Hint is disabled while AI is thinking in single-player mode', () => {
        jest.useFakeTimers();

        render(<Game />);
        setModeToAI();

        const hintBtn = screen.getByRole('button', { name: /Hint/i });

        // Human starts; hint is available.
        expect(hintBtn).toBeEnabled();

        // Human plays X -> AI thinking, hint should be disabled.
        clickSquare('r1c1');
        expect(hintBtn).toBeDisabled();

        // After AI plays, it becomes human's turn again, hint should re-enable.
        act(() => {
            jest.advanceTimersByTime(400);
        });
        expect(hintBtn).toBeEnabled();

        jest.useRealTimers();
    });

    it('time travel via move history works in local mode and truncates future moves when making a new move', () => {
        render(<Game />);

        setModeToLocal();

        clickSquare('r1c1'); // X
        clickSquare('r1c2'); // O
        clickSquare('r1c3'); // X

        // Jump back to move #1 (after X @ r1c1)
        fireEvent.click(screen.getByRole('button', { name: /Go to move #1/i }));
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c2, empty/i)).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c3, empty/i)).toBeTruthy();
        expect(screen.getByText('Turn: O')).toBeTruthy();

        // Make a new move from this point, which should truncate previous future
        clickSquare('r3c3'); // O at bottom-right on 3x3

        // There should no longer be a "move #3" button (history was truncated then extended)
        expect(screen.queryByRole('button', { name: /Go to move #3/i })).toBeNull();

        // And the newly placed mark should be present
        expect(screen.getByLabelText(/Square r3c3, O/i)).toBeTruthy();
    });

    it('single-player mode: after human plays X, AI responds with O (Easy difficulty)', () => {
        jest.useFakeTimers();

        render(<Game />);

        setModeToAI();

        // Set difficulty to Easy for deterministic-ish behavior (still random, but must place some O)
        fireEvent.change(screen.getByLabelText(/Select AI difficulty/i), {
            target: { value: 'Easy' },
        });

        // Human plays X
        clickSquare('r1c1');
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();

        // Advance timers to let AI move execute
        act(() => {
            jest.advanceTimersByTime(400);
        });

        // There should now be exactly one O somewhere on the board.
        const oSquares = screen.queryAllByLabelText(/, O$/i);
        expect(oSquares.length).toBe(1);

        jest.useRealTimers();
    });

    it('changing board size resets the board (switch to 4x4)', () => {
        render(<Game />);
        setModeToLocal();

        // Make a move on 3x3.
        clickSquare('r1c1');
        expect(screen.getByLabelText(/Square r1c1, X/i)).toBeTruthy();

        // Change board to 4x4; board should reset (r1c1 empty).
        fireEvent.change(screen.getByLabelText(/Select board size/i), {
            target: { value: '4' },
        });

        expect(screen.getByText('Turn: X')).toBeTruthy();
        expect(screen.getByLabelText(/Square r1c1, empty/i)).toBeTruthy();

        // Ensure a 4x4 coordinate exists now (r4c4).
        expect(screen.getByLabelText(/Square r4c4, empty/i)).toBeTruthy();
    });
});

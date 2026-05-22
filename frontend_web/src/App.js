import React from 'react';
import Game from './components/Game';

/**
 * Root application component.
 */
export default function App() {
    return (
        <div className="app">
            <main className="shell" aria-label="Tic Tac Toe game">
                <header className="header">
                    <div className="brand">
                        <div className="brandMark" aria-hidden="true" />
                        <div>
                            <h1 className="title">Tic Tac Toe</h1>
                            <p className="subtitle">Two-player local game or single-player vs AI.</p>
                        </div>
                    </div>
                </header>

                <section className="content">
                    <Game />
                </section>

                <footer className="footer">
                    <p className="footnote">
                        Tip: First player is <strong>X</strong>. You can customize board size and win
                        length above.
                    </p>
                </footer>
            </main>
        </div>
    );
}

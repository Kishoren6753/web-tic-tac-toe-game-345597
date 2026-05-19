import React from "react";
import Game from "./components/Game";

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
              <p className="subtitle">
                Two-player local game. Take turns placing X and O.
              </p>
            </div>
          </div>
        </header>

        <section className="content">
          <Game />
        </section>

        <footer className="footer">
          <p className="footnote">
            Tip: First player is <strong>X</strong>. Get 3 in a row to win.
          </p>
        </footer>
      </main>
    </div>
  );
}

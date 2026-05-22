import React from 'react';

/**
 * @param {{
 *  value: null | 'X' | 'O',
 *  index: number,
 *  boardSize: number,
 *  onClick: () => void,
 *  highlight: boolean,
 *  disabled: boolean
 * }} props
 */
export default function Square({ value, index, boardSize, onClick, highlight, disabled }) {
    const row = Math.floor(index / boardSize) + 1;
    const col = (index % boardSize) + 1;

    const labelValue = value ? value : 'empty';
    const ariaLabel = `Square r${row}c${col}, ${labelValue}`;

    return (
        <button
            type="button"
            className={'square' + (highlight ? ' highlight' : '')}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            <span className={'mark ' + (value === 'X' ? 'markX' : value === 'O' ? 'markO' : '')}>
                {value}
            </span>
        </button>
    );
}

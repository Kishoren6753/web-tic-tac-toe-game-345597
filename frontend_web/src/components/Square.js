import React from "react";

/**
 * @param {{
 *  value: null | "X" | "O",
 *  index: number,
 *  onClick: () => void,
 *  highlight: boolean,
 *  disabled: boolean
 * }} props
 */
export default function Square({ value, index, onClick, highlight, disabled }) {
  const labelValue = value ? value : "empty";
  const ariaLabel = `Square ${index + 1}, ${labelValue}`;

  return (
    <button
      type="button"
      className={"square" + (highlight ? " highlight" : "")}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <span className={"mark " + (value === "X" ? "markX" : value === "O" ? "markO" : "")}>
        {value}
      </span>
    </button>
  );
}

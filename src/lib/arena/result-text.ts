/**
 * How a game ended, in words a person reads: "Minimax wins by three in a row", "White wins on time",
 * "No result (move limit)". The raw reason stays on the saved match and in the report.
 */
export function describeResult(result: { winner?: string | null; reason: string }, nameOf: (seat: string) => string): string {
  const r = result.reason;
  if (!result.winner) return r === "Maximum turn limit reached" ? "No result (move limit)" : `Draw by ${r}`;
  const how = r.startsWith("Bot error: timeout")
    ? "on time"
    : r.startsWith("Bot error: runtime-error")
      ? "by forfeit (the other side crashed)"
      : r === "Illegal move"
        ? "by forfeit (illegal move)"
        : r.startsWith("Bot error") || r.startsWith("Bot returned")
          ? "by forfeit (no usable move)"
          : `by ${r}`;
  return `${nameOf(result.winner)} wins ${how}`;
}

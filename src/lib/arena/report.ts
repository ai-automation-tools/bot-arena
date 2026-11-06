import type { PostMatchAuditorInput } from "@/ai/flows/post-match-auditor";
import type { MatchSummary, SeatStats } from "./arena";
import { GAMES, type GameId } from "./games";

/** The match report: plain facts from a saved or live match, plus the auditor's input built from them. */
export interface MatchReport {
  headline: string;
  game: string;
  plies: number;
  durationMs: number | null;
  seats: { seat: string; name: string; kind: string; won: boolean; stats: SeatStats | null; avgMs: number | null }[];
  auditor: PostMatchAuditorInput;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;

export function headline(m: MatchSummary): string {
  if (!m.result) return m.status === "in-progress" ? `In progress: ${m.players[m.toMove]?.name ?? m.toMove} to move` : `Ended (${m.status})`;
  const winner = m.result.winner ? m.players[m.result.winner]?.name ?? m.result.winner : null;
  return winner ? `${winner} won by ${m.result.reason}` : `Draw by ${m.result.reason}`;
}

function metrics(s: SeatStats | undefined): string {
  if (!s) return "No per-move stats were saved for this game. Violations: 0";
  const avg = s.moves ? s.totalMs / s.moves : 0;
  return `${s.moves} moves, avg ${secs(avg)}, slowest ${secs(s.maxMs)}, timeouts ${s.timeouts}, rejected moves ${s.rejected}, forfeits ${s.forfeits}. Violations: ${s.rejected + s.forfeits + s.timeouts}`;
}

export function buildReport(m: MatchSummary): MatchReport {
  const seats = Object.keys(m.players);
  const game = GAMES[m.game as GameId]?.name ?? m.game;
  const end = m.finishedAt ? Date.parse(m.finishedAt) - Date.parse(m.createdAt) : NaN;
  const describe = (seat: string) => `${m.players[seat].name} (${seat}, ${m.players[seat].kind})`;
  return {
    headline: headline(m),
    game,
    plies: m.moves.length,
    durationMs: Number.isFinite(end) ? end : null,
    seats: seats.map((seat) => {
      const stats = m.stats?.[seat] ?? null;
      return {
        seat,
        name: m.players[seat].name,
        kind: m.players[seat].kind,
        won: m.result?.winner === seat,
        stats,
        avgMs: stats?.moves ? stats.totalMs / stats.moves : null,
      };
    }),
    auditor: {
      matchSummary: `${game}: ${seats.map(describe).join(" vs ")}. ${headline(m)} after ${m.moves.length} plies.`,
      agent1Metrics: `${m.players[seats[0]].name}: ${metrics(m.stats?.[seats[0]])}`,
      agent2Metrics: `${m.players[seats[1]].name}: ${metrics(m.stats?.[seats[1]])}`,
    },
  };
}

/**
 * Seat tokens for matches started in this tab, so the match page can show them again after "Watch the match".
 * sessionStorage: per tab and per origin, gone when the tab closes. Storage can be blocked, so every call is
 * allowed to fail; the tokens are still on screen right after the match starts.
 */
import { useMemo, useSyncExternalStore } from 'react';

const key = (matchId: string) => `bot-arena:tokens:${matchId}`;

export function saveSeatTokens(matchId: string, tokens: Record<string, string>): void {
  try {
    sessionStorage.setItem(key(matchId), JSON.stringify(tokens));
  } catch {}
}

const noSubscribe = () => () => {};
const readRaw = (matchId: string) => {
  try {
    return sessionStorage.getItem(key(matchId));
  } catch {
    return null;
  }
};

/** The tokens saved for this match in this tab, or null (always null on the server). */
export function useSeatTokens(matchId: string): Record<string, string> | null {
  const raw = useSyncExternalStore(noSubscribe, () => readRaw(matchId), () => null);
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as Record<string, string>) : null;
    } catch {
      return null;
    }
  }, [raw]);
}

export function forgetSeatTokens(matchId: string): void {
  try {
    sessionStorage.removeItem(key(matchId));
  } catch {}
}

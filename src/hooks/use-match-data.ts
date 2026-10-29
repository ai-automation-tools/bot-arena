import { useState, useEffect, useCallback } from "react";
import type { MatchState, MatchResult } from "@/lib/match-runner";

export interface UseMatchDataResult {
  matchState: MatchState | null;
  matchResult: MatchResult | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

async function fetchMatch(id: string): Promise<{ state: MatchState; result: MatchResult | null }> {
  const response = await fetch(`/api/match/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch match");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error");
  }
  return data.match;
}

/**
 * Hook to fetch match data by ID
 * Fetches both match state and result (if available)
 */
export function useMatchData(matchId: string | null): UseMatchDataResult {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State is only set from promise callbacks, so the effect never triggers a cascading render.
  const load = useCallback(
    (id: string) =>
      fetchMatch(id)
        .then((match) => {
          setMatchState(match.state);
          setMatchResult(match.result);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to fetch match");
          console.error("Error fetching match:", err);
        })
        .finally(() => setIsLoading(false)),
    []
  );

  useEffect(() => {
    if (matchId) load(matchId);
  }, [matchId, load]);

  const refetch = async () => {
    if (!matchId) return;
    setIsLoading(true);
    setError(null);
    await load(matchId);
  };

  return {
    matchState,
    matchResult,
    isLoading: matchId ? isLoading : false,
    error,
    refetch,
  };
}

import { useState, useEffect } from "react";
import type { MatchState, MatchResult } from "@/lib/match-runner";

export interface UseMatchDataResult {
  matchState: MatchState | null;
  matchResult: MatchResult | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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

  const fetchMatch = async () => {
    if (!matchId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/match/${matchId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch match");
      }

      const data = await response.json();

      if (data.success) {
        setMatchState(data.match.state);
        setMatchResult(data.match.result);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch match");
      console.error("Error fetching match:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  return {
    matchState,
    matchResult,
    isLoading,
    error,
    refetch: fetchMatch,
  };
}

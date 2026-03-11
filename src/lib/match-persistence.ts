
import { MatchState, MatchResult } from './match-runner'; // Assuming these types exist

/**
 * Interface for a match persistence layer.
 * Defines methods for saving and loading match states and results.
 */
export interface MatchPersistence {
  saveMatchState(matchId: string, state: MatchState): Promise<void>;
  loadMatchState(matchId: string): Promise<MatchState | null>;
  saveMatchResult(matchId: string, result: MatchResult): Promise<void>;
  loadMatchResult(matchId: string): Promise<MatchResult | null>;
  listMatchIds(): Promise<string[]>;
}

/**
 * In-memory implementation of MatchPersistence for development/testing.
 * This should be replaced with a proper database integration in production.
 */
class InMemoryMatchPersistence implements MatchPersistence {
  private matchStates: Map<string, MatchState> = new Map();
  private matchResults: Map<string, MatchResult> = new Map();

  async saveMatchState(matchId: string, state: MatchState): Promise<void> {
    this.matchStates.set(matchId, state);
    console.log(`[Persistence] Saved state for match ${matchId}`);
  }

  async loadMatchState(matchId: string): Promise<MatchState | null> {
    const state = this.matchStates.get(matchId);
    if (state) {
      console.log(`[Persistence] Loaded state for match ${matchId}`);
    } else {
      console.log(`[Persistence] No state found for match ${matchId}`);
    }
    return state || null;
  }

  async saveMatchResult(matchId: string, result: MatchResult): Promise<void> {
    this.matchResults.set(matchId, result);
    console.log(`[Persistence] Saved result for match ${matchId}`);
  }

  async loadMatchResult(matchId: string): Promise<MatchResult | null> {
    const result = this.matchResults.get(matchId);
    if (result) {
      console.log(`[Persistence] Loaded result for match ${matchId}`);
    } else {
      console.log(`[Persistence] No result found for match ${matchId}`);
    }
    return result || null;
  }

  async listMatchIds(): Promise<string[]> {
    return Array.from(new Set([...this.matchStates.keys(), ...this.matchResults.keys()]));
  }
}

export const matchPersistence: MatchPersistence = new InMemoryMatchPersistence();

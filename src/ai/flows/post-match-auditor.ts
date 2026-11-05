/**
 * @fileOverview Post-match summary, efficiency analysis and failure diagnosis.
 *
 * Template-based since Genkit was removed on 2026-10-22: the report restates the match data it
 * is given, with no model call and no API key. The roadmap's optional AI commentary item brings the AI
 * audit back; AUDITOR_PROMPT is the prompt to send it.
 *
 * - postMatchAuditor - A function that handles the post-match analysis process.
 * - PostMatchAuditorInput - The input type for the postMatchAuditor function.
 * - PostMatchAuditorOutput - The return type for the postMatchAuditor function.
 */

export type PostMatchAuditorInput = {
  /** A detailed summary of the match. */
  matchSummary: string;
  /** Performance metrics for Agent 1. */
  agent1Metrics: string;
  /** Performance metrics for Agent 2. */
  agent2Metrics: string;
};

export type PostMatchAuditorOutput = {
  /** A strategic summary of the match. */
  strategicSummary: string;
  /** An analysis of the efficiency of each agent. */
  efficiencyAnalysis: string;
  /** A diagnosis of any failures that occurred during the match. */
  failureDiagnosis: string;
};

export const AUDITOR_PROMPT = `You are an expert AI analyst reviewing a BotArena Retro match.

  Provide a strategic summary, efficiency analysis, and failure diagnosis based on the provided match data.

  Match Summary: {{{matchSummary}}}
  Agent 1 Metrics: {{{agent1Metrics}}}
  Agent 2 Metrics: {{{agent2Metrics}}}

  Strategic Summary:
  Efficiency Analysis:
  Failure Diagnosis:`;

export async function postMatchAuditor(input: PostMatchAuditorInput): Promise<PostMatchAuditorOutput> {
  const violations = (metrics: string) => Number(metrics.match(/Violations: (\d+)/)?.[1] ?? 0);
  const v1 = violations(input.agent1Metrics);
  const v2 = violations(input.agent2Metrics);

  return {
    strategicSummary: input.matchSummary.trim(),
    efficiencyAnalysis: `Agent 1: ${input.agent1Metrics.trim()}\nAgent 2: ${input.agent2Metrics.trim()}`,
    failureDiagnosis: v1 + v2 === 0
      ? 'No rule violations recorded for either agent.'
      : `Rule violations recorded: Agent 1 ${v1}, Agent 2 ${v2}.`,
  };
}

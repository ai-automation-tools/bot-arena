'use server';

/**
 * @fileOverview Provides a strategic summary, efficiency analysis, and failure diagnosis after each match.
 *
 * - postMatchAuditor - A function that handles the post-match analysis process.
 * - PostMatchAuditorInput - The input type for the postMatchAuditor function.
 * - PostMatchAuditorOutput - The return type for the postMatchAuditor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PostMatchAuditorInputSchema = z.object({
  matchSummary: z.string().describe('A detailed summary of the match.'),
  agent1Metrics: z.string().describe('Performance metrics for Agent 1.'),
  agent2Metrics: z.string().describe('Performance metrics for Agent 2.'),
});
export type PostMatchAuditorInput = z.infer<typeof PostMatchAuditorInputSchema>;

const PostMatchAuditorOutputSchema = z.object({
  strategicSummary: z.string().describe('A strategic summary of the match.'),
  efficiencyAnalysis: z.string().describe('An analysis of the efficiency of each agent.'),
  failureDiagnosis: z.string().describe('A diagnosis of any failures that occurred during the match.'),
});
export type PostMatchAuditorOutput = z.infer<typeof PostMatchAuditorOutputSchema>;

export async function postMatchAuditor(input: PostMatchAuditorInput): Promise<PostMatchAuditorOutput> {
  return postMatchAuditorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'postMatchAuditorPrompt',
  input: {schema: PostMatchAuditorInputSchema},
  output: {schema: PostMatchAuditorOutputSchema},
  prompt: `You are an expert AI analyst reviewing a BotArena Retro match.

  Provide a strategic summary, efficiency analysis, and failure diagnosis based on the provided match data.

  Match Summary: {{{matchSummary}}}
  Agent 1 Metrics: {{{agent1Metrics}}}
  Agent 2 Metrics: {{{agent2Metrics}}}

  Strategic Summary:
  Efficiency Analysis:
  Failure Diagnosis:`,
});

const postMatchAuditorFlow = ai.defineFlow(
  {
    name: 'postMatchAuditorFlow',
    inputSchema: PostMatchAuditorInputSchema,
    outputSchema: PostMatchAuditorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

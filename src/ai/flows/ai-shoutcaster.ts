'use server';

/**
 * @fileOverview AI Shoutcaster Flow: Provides live, retro-style commentary during protocol executions.
 *
 * - aiShoutcaster - A function that generates commentary.
 * - AiShoutcasterInput - The input type for the aiShoutcaster function.
 * - AiShoutcasterOutput - The return type for the aiShoutcaster function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiShoutcasterInputSchema = z.object({
  gameState: z.string().describe('The current state of the game.'),
  eventLog: z.string().describe('The log of events that have occurred in the game.'),
  commentaryMode: z.enum(['analyst', 'hype', 'debug']).describe('The mode of commentary to use.'),
});
export type AiShoutcasterInput = z.infer<typeof AiShoutcasterInputSchema>;

const AiShoutcasterOutputSchema = z.object({
  commentary: z.string().describe('The generated commentary for the game.'),
});
export type AiShoutcasterOutput = z.infer<typeof AiShoutcasterOutputSchema>;

export async function aiShoutcaster(input: AiShoutcasterInput): Promise<AiShoutcasterOutput> {
  return aiShoutcasterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiShoutcasterPrompt',
  input: {schema: AiShoutcasterInputSchema},
  output: {schema: AiShoutcasterOutputSchema},
  prompt: `You are a retro-style AI shoutcaster providing live commentary for a competitive arena game.

Current Game State: {{{gameState}}}

Event Log: {{{eventLog}}}

Commentary Mode: {{{commentaryMode}}}

Based on the current game state, event log, and commentary mode, generate commentary that is informative and engaging. Adopt a 1980s mainframe / hacker terminal theme with CRT scanlines, monospaced pixel fonts and ASCII and Unicode UI elements.

In analyst mode, provide insightful analysis of the game.

In hype mode, generate exciting and enthusiastic commentary.

In debug mode, provide detailed technical information about the game.

Output:
`,
});

const aiShoutcasterFlow = ai.defineFlow(
  {
    name: 'aiShoutcasterFlow',
    inputSchema: AiShoutcasterInputSchema,
    outputSchema: AiShoutcasterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

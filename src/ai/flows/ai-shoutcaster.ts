/**
 * @fileOverview Shoutcaster commentary for a live match.
 *
 * Template-based since Genkit was removed on 2026-10-22: the commentary is built from the game
 * state, with no model call and no API key. The roadmap's optional AI commentary item brings AI
 * commentary back; SHOUTCASTER_PROMPT is the prompt to send it.
 *
 * - aiShoutcaster - A function that generates commentary.
 * - AiShoutcasterInput - The input type for the aiShoutcaster function.
 * - AiShoutcasterOutput - The return type for the aiShoutcaster function.
 */

export type AiShoutcasterInput = {
  /** The current state of the game: a FEN line, then "White to move" or "Black to move" with any CHECK! / CHECKMATE!, then "Moves played: N". */
  gameState: string;
  /** The log of events that have occurred in the game. */
  eventLog: string;
  /** The mode of commentary to use. */
  commentaryMode: 'analyst' | 'hype' | 'debug';
};

export type AiShoutcasterOutput = {
  /** The generated commentary for the game. */
  commentary: string;
};

export const SHOUTCASTER_PROMPT = `You are a retro-style AI shoutcaster providing live commentary for a competitive arena game.

Current Game State: {{{gameState}}}

Event Log: {{{eventLog}}}

Commentary Mode: {{{commentaryMode}}}

Based on the current game state, event log, and commentary mode, generate commentary that is informative and engaging. Adopt a 1980s mainframe / hacker terminal theme with CRT scanlines, monospaced pixel fonts and ASCII and Unicode UI elements.

In analyst mode, provide insightful analysis of the game.

In hype mode, generate exciting and enthusiastic commentary.

In debug mode, provide detailed technical information about the game.

Output:
`;

export async function aiShoutcaster(input: AiShoutcasterInput): Promise<AiShoutcasterOutput> {
  const { gameState, eventLog, commentaryMode } = input;
  const toMove = /Black to move/.test(gameState) ? 'Black' : 'White';
  const justMoved = toMove === 'White' ? 'Black' : 'White';
  const moves = gameState.match(/Moves played: (\d+)/)?.[1] ?? '0';

  if (commentaryMode === 'debug') {
    const lastEvent = eventLog.trim().split('\n').pop() || 'none';
    return { commentary: `/// DEBUG ///\n${gameState}\nLast event: ${lastEvent}` };
  }

  if (/CHECKMATE!/.test(gameState)) {
    return {
      commentary: commentaryMode === 'hype'
        ? `/// CHECKMATE!!! ${justMoved.toUpperCase()} WINS! An incredible display of silicon supremacy! ///`
        : `/// CHECKMATE. ${justMoved} wins after ${moves} moves. ///`,
    };
  }

  if (/CHECK!/.test(gameState)) {
    return {
      commentary: commentaryMode === 'hype'
        ? `/// CHECK! The pressure mounts as ${toMove} must answer the threat! ///`
        : `/// ${toMove} is in check after move ${moves} and has to respond. ///`,
    };
  }

  return {
    commentary: commentaryMode === 'hype'
      ? `/// LIVE: Move ${moves} is on the board! ${toMove} is plotting the next strike... ///`
      : `/// Move ${moves} complete. ${toMove} to move. ///`,
  };
}

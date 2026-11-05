import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ConnectSnippets } from '@/components/connect-snippets';

export const metadata: Metadata = {
  title: 'Connect Agents',
  description: 'Connect your agents over MCP, REST, a webhook, or as JavaScript.',
};

const WAYS = [
  ['MCP', 'Any MCP client (Claude Code, Claude Desktop, Cursor, your own agent) adds the arena as a Streamable HTTP server at /api/mcp. Tools: create_match, wait_for_turn, make_move, resign, list_matches, get_match.'],
  ['REST', 'Long-poll GET /api/matches/:id/turn, then POST /api/matches/:id/move, with your seat token as a Bearer token. Works from any language.'],
  ['Webhook', 'Run your agent as an HTTP server. The arena POSTs each turn (board, FEN, legal moves) to your URL and plays the "move" in your JSON reply.'],
  ['Code bot', 'Paste a JavaScript function on the New Match page. It runs in the arena with chess.js available and nothing blocked.'],
] as const;

export default function ConnectPage() {
  return (
    <div className="p-4 md:p-8 min-w-0 flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-primary">-- Connect Agents --</h1>
        <p className="text-muted-foreground mt-2">
          [START A MATCH WITH AN AGENT SEAT ON{' '}
          <Link href="/new" className="text-accent underline">NEW MATCH</Link>, THEN CONNECT THE AGENT ONE OF THESE WAYS]
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WAYS.map(([title, text]) => (
          <Card key={title} className="p-4">
            <h2 className="font-mono text-accent mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </Card>
        ))}
      </div>
      <ConnectSnippets />
      <p className="text-sm text-muted-foreground">
        The full reference, with the turn object and every error code, is <code>docs/connecting-agents.md</code> in the repo.
        The arena only answers this machine; read the README before opening it to a network.
      </p>
    </div>
  );
}

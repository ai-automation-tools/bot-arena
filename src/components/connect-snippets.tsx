'use client';

import { useState, useSyncExternalStore } from 'react';
import { Card } from '@/components/ui/card';

function Snippet({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-accent">{label}</span>
        <button
          type="button"
          className="font-mono text-xs text-muted-foreground hover:text-accent px-2 py-1"
          onClick={() => navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>
      <pre className="bg-black/60 border border-primary/20 rounded p-3 text-xs whitespace-pre-wrap break-all"><code>{code}</code></pre>
    </div>
  );
}

/** The arena's own address as the browser sees it, so the snippets work on whatever port it runs. */
const noSubscribe = () => () => {};
export function useOrigin() {
  return useSyncExternalStore(noSubscribe, () => window.location.origin, () => 'http://localhost:9002');
}

/** How to connect an agent: to the arena in general, or to one seat when a match id and token are given. */
export function ConnectSnippets({ seat }: { seat?: { matchId: string; color: string; token: string } }) {
  const origin = useOrigin();
  const mcpUrl = `${origin}/api/mcp`;
  const id = seat?.matchId ?? '<match id>';
  const token = seat?.token ?? '<seat token>';

  return (
    <Card className="p-4 flex flex-col gap-4 min-w-0">
      {seat && (
        <p className="font-mono text-sm">
          <span className="text-accent">{seat.color.toUpperCase()}</span> seat token:{' '}
          <code className="break-all bg-black/60 px-1 rounded">{seat.token}</code>
        </p>
      )}
      <Snippet label="MCP · Claude Code" code={`claude mcp add --transport http bot-arena ${mcpUrl}`} />
      <Snippet
        label="MCP · any client (JSON config)"
        code={JSON.stringify({ mcpServers: { 'bot-arena': { type: 'http', url: mcpUrl } } }, null, 2)}
      />
      <Snippet
        label="Then tell the agent"
        code={`Use the bot-arena MCP tools to play match ${id} as ${seat?.color ?? '<seat>'} with seat token ${token}. Loop: wait_for_turn, pick a strong move from the legal moves, make_move, until the status is finished.`}
      />
      <Snippet
        label="REST · any language"
        code={`# wait for your move (long-poll, up to 25s)
curl -H "Authorization: Bearer ${token}" ${origin}/api/matches/${id}/turn?wait=25
# play it (SAN "Nf3", UCI "g1f3", or {"from":"g1","to":"f3"})
curl -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"move":"e4"}' ${origin}/api/matches/${id}/move`}
      />
    </Card>
  );
}

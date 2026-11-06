'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConnectSnippets } from '@/components/connect-snippets';

type Kind = 'external' | 'house' | 'code' | 'webhook';
type Game = 'chess' | 'tictactoe';
const SEATS: Record<Game, [string, string]> = { chess: ['white', 'black'], tictactoe: ['x', 'o'] };
const BOT_NAMES: Record<Game, Record<SeatForm['bot'], string>> = {
  chess: { 'search-engine': 'Search Engine (depth-2 search)', 'random-mover': 'Random Mover' },
  tictactoe: { 'search-engine': 'Minimax (perfect play)', 'random-mover': 'Random Mover' },
};
interface SeatForm { kind: Kind; name: string; bot: 'random-mover' | 'search-engine'; code: string; url: string }

export const CODE_TEMPLATE = `// Runs inside the arena on every turn of your seat.
// state: { game, position, board, legalMoves, moveHistory, you, opponent, rules, turnTimeoutMs, ... }
// Chess: state.fen too, chess.js is available as \`Chess\`; return "Nf3", "g1f3" or { from, to, promotion }.
// Tic-tac-toe: return a cell like "b2" (the centre) or 1-9.
export default function (state) {
  const captures = state.legalMoves.filter((m) => m.includes("x"));
  const pool = captures.length ? captures : state.legalMoves;
  return pool[Math.floor(Math.random() * pool.length)];
}
`;

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: 'external', label: 'Agent (MCP or REST)', hint: 'Your agent connects and plays with a seat token you get after starting.' },
  { value: 'house', label: 'House bot', hint: 'A built-in opponent.' },
  { value: 'code', label: 'Code bot (JavaScript)', hint: 'Runs inside the arena on your machine. Full JavaScript, nothing blocked; a call is cut off after 10s.' },
  { value: 'webhook', label: 'Webhook', hint: 'The arena POSTs each turn to your URL and expects { "move": "e4" } back.' },
];

const field = 'w-full bg-black/60 border border-primary/30 rounded px-3 py-2 text-base md:text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

function SeatEditor({ game, color, seat, onChange }: { game: Game; color: string; seat: SeatForm; onChange: (s: SeatForm) => void }) {
  const id = (f: string) => `${color}-${f}`;
  const hint = KINDS.find((k) => k.value === seat.kind)?.hint;
  return (
    <Card className="p-4 flex flex-col gap-3 min-w-0">
      <h2 className="font-mono text-accent">{color.toUpperCase()}</h2>
      <label htmlFor={id('kind')} className="text-sm text-muted-foreground">Who plays</label>
      <select id={id('kind')} className={field} value={seat.kind} onChange={(e) => onChange({ ...seat, kind: e.target.value as Kind })}>
        {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
      </select>
      <p className="text-xs text-muted-foreground">{hint}</p>

      {seat.kind === 'house' ? (
        <>
          <label htmlFor={id('bot')} className="text-sm text-muted-foreground">Bot</label>
          <select id={id('bot')} className={field} value={seat.bot} onChange={(e) => onChange({ ...seat, bot: e.target.value as SeatForm['bot'] })}>
            {(['search-engine', 'random-mover'] as const).map((b) => <option key={b} value={b}>{BOT_NAMES[game][b]}</option>)}
          </select>
        </>
      ) : (
        <>
          <label htmlFor={id('name')} className="text-sm text-muted-foreground">Name</label>
          <input id={id('name')} className={field} value={seat.name} maxLength={60} placeholder={seat.kind === 'external' ? 'e.g. Claude, GPT agent' : 'optional'} onChange={(e) => onChange({ ...seat, name: e.target.value })} />
        </>
      )}
      {seat.kind === 'code' && (
        <>
          <label htmlFor={id('code')} className="text-sm text-muted-foreground">Code</label>
          <textarea id={id('code')} className={`${field} min-h-[260px]`} spellCheck={false} value={seat.code} onChange={(e) => onChange({ ...seat, code: e.target.value })} />
        </>
      )}
      {seat.kind === 'webhook' && (
        <>
          <label htmlFor={id('url')} className="text-sm text-muted-foreground">URL</label>
          <input id={id('url')} type="url" className={field} value={seat.url} placeholder="http://localhost:8000/move" onChange={(e) => onChange({ ...seat, url: e.target.value })} />
        </>
      )}
    </Card>
  );
}

function toSpec(s: SeatForm) {
  const name = s.name.trim() || undefined;
  switch (s.kind) {
    case 'house': return { kind: 'house', bot: s.bot };
    case 'code': return { kind: 'code', code: s.code, name };
    case 'webhook': return { kind: 'webhook', url: s.url, name };
    case 'external': return { kind: 'external', name };
  }
}

export function NewMatchForm() {
  const router = useRouter();
  const blank = (kind: Kind): SeatForm => ({ kind, name: '', bot: 'search-engine', code: CODE_TEMPLATE, url: '' });
  const [game, setGame] = useState<Game>('chess');
  // One form per seat position, so switching games keeps what you entered.
  const [forms, setForms] = useState<[SeatForm, SeatForm]>([blank('external'), blank('house')]);
  const [timeoutS, setTimeoutS] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; tokens: Record<string, string> } | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ game, [SEATS[game][0]]: toSpec(forms[0]), [SEATS[game][1]]: toSpec(forms[1]), turnTimeoutMs: timeoutS * 1000 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.details?.map((d: { path: string[]; message: string }) => `${d.path.join('.')}: ${d.message}`).join('; ') || body.error);
      if (Object.keys(body.tokens).length) setCreated({ id: body.match.id, tokens: body.tokens });
      else router.push(`/matches/${body.match.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-muted-foreground">
          Match <span className="text-accent font-mono">{created.id}</span> is on. Each agent seat below has its own token; give it to the agent that plays that side.
          The clock for a side starts on its turn.
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(created.tokens).map(([color, token]) => (
            <ConnectSnippets key={color} seat={{ matchId: created.id, color, token }} />
          ))}
        </div>
        <Button asChild className="self-start bg-accent text-accent-foreground hover:bg-accent/80">
          <Link href={`/matches/${created.id}`}>Watch the match →</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted-foreground mb-1">Game</legend>
        <div className="flex flex-wrap gap-2">
          {(['chess', 'tictactoe'] as const).map((g) => (
            <Button key={g} type="button" variant={game === g ? 'default' : 'outline'} aria-pressed={game === g} onClick={() => setGame(g)} className="min-h-[40px]">
              {g === 'chess' ? 'Chess' : 'Tic-Tac-Toe'}
            </Button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SEATS[game].map((c, i) => (
          <SeatEditor key={c} game={game} color={c} seat={forms[i]} onChange={(s) => setForms((prev) => (i ? [prev[0], s] : [s, prev[1]]))} />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="timeout" className="text-sm text-muted-foreground">Seconds per move</label>
          <input id="timeout" type="number" min={1} max={3600} className={`${field} w-32`} value={timeoutS} onChange={(e) => setTimeoutS(Number(e.target.value) || 120)} />
        </div>
        <Button type="submit" disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/80 min-h-[40px]">
          {busy ? 'Starting…' : 'Start match'}
        </Button>
      </div>
      {error && <p role="alert" className="text-destructive font-mono text-sm break-words">{error}</p>}
    </form>
  );
}

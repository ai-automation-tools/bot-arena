'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConnectSnippets } from '@/components/connect-snippets';
import { MatchReplay } from '@/components/match-replay';
import type { MatchSummary } from '@/lib/arena/arena';
import { GAME_NAMES } from '@/lib/replay';
import { forgetSeatTokens, useSeatTokens } from '@/lib/seat-tokens';

const KIND_LABEL: Record<MatchSummary['players'][string]['kind'], string> = { external: 'agent', house: 'house bot', code: 'code bot', webhook: 'webhook' };

/** Polls the match once a second while it's being played and feeds the replay player. */
export function LiveMatch({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokens = useSeatTokens(id);
  const live = match?.status === 'in-progress';
  useEffect(() => {
    if (match && !live) forgetSeatTokens(id);
  }, [id, match, live]);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/matches/${id}`, { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (stop) return;
        setMatch(body);
        setError(null);
        if (body.status === 'in-progress') timer = setTimeout(poll, 1000);
      } catch (e) {
        if (stop) return;
        setError((e as Error).message);
        timer = setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { stop = true; clearTimeout(timer); };
  }, [id]);

  if (error && !match) {
    return (
      <p role="alert" className="text-destructive font-mono">
        Can&apos;t load match {id}: {error}. <Link className="underline" href="/history">All matches</Link>
      </p>
    );
  }
  if (!match) return <p className="font-mono text-muted-foreground">Loading match {id}…</p>;

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-primary">MATCH {match.id.toUpperCase()}</h1>
        <p className="text-muted-foreground">
          {GAME_NAMES[match.game]} ·{' '}
          {Object.entries(match.players).map(([seat, p], i) => (
            <span key={seat}>
              {i > 0 && ' vs '}
              <span className="text-accent">{p.name}</span> ({KIND_LABEL[p.kind]}, {seat})
            </span>
          ))}{' '}
          ·{' '}
          {match.status === 'in-progress' ? <span className="text-green-400">LIVE · {match.turnTimeoutMs / 1000}s per move</span> : (
            <>
              {match.status} · <Link className="text-accent underline" href={`/matches/${match.id}/report`}>Match report</Link>
            </>
          )}
        </p>
      </header>
      {live && tokens && (
        <details open>
          <summary className="cursor-pointer font-mono text-accent">Seat tokens for your agents</summary>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
            {Object.entries(tokens).map(([color, token]) => (
              <ConnectSnippets key={color} seat={{ matchId: id, color, token }} />
            ))}
          </div>
        </details>
      )}
      <MatchReplay match={match} />
    </>
  );
}

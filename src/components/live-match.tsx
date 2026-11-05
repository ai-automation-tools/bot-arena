'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MatchChessReplay } from '@/components/match-chess-replay';
import type { MatchSummary } from '@/lib/arena/arena';

const KIND_LABEL: Record<MatchSummary['white']['kind'], string> = { external: 'agent', house: 'house bot', code: 'code bot', webhook: 'webhook' };

/** Polls the match once a second while it's being played and feeds the replay player. */
export function LiveMatch({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <span className="text-accent">{match.white.name}</span> ({KIND_LABEL[match.white.kind]}, white) vs{' '}
          <span className="text-accent">{match.black.name}</span> ({KIND_LABEL[match.black.kind]}, black) ·{' '}
          {match.status === 'in-progress' ? <span className="text-green-400">LIVE · {match.turnTimeoutMs / 1000}s per move</span> : match.status}
        </p>
      </header>
      <MatchChessReplay match={match} />
    </>
  );
}

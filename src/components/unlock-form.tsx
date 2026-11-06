'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function UnlockForm({ next }: { next: string }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      window.location.assign(next); // a full load, so every page sees the new cookie
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="arena-key" className="text-sm text-muted-foreground">Arena key</label>
      <input
        id="arena-key"
        type="password"
        autoComplete="current-password"
        required
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="w-full bg-black/60 border border-primary/30 rounded px-3 py-2 text-base md:text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <Button type="submit" disabled={busy} className="self-start bg-accent text-accent-foreground hover:bg-accent/80 min-h-[40px]">
        {busy ? 'Checking…' : 'Unlock'}
      </Button>
      {error && <p role="alert" className="text-destructive font-mono text-sm">{error}</p>}
    </form>
  );
}

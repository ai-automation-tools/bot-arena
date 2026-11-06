import type { Metadata } from 'next';
import { UnlockForm } from '@/components/unlock-form';

export const metadata: Metadata = { title: 'Unlock' };

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Only same-site paths, so the form can't be used to bounce someone to another site.
  const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
  return (
    <div className="p-4 md:p-8 min-w-0 max-w-xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Unlock --</h1>
        <p className="text-muted-foreground mt-2">
          This arena has an access key (<code>ARENA_API_KEY</code>). Enter it once; this browser keeps it for 30 days.
        </p>
      </header>
      <UnlockForm next={target} />
    </div>
  );
}

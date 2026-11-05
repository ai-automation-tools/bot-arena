import type { Metadata } from 'next';
import { LiveMatch } from '@/components/live-match';

export const metadata: Metadata = { title: 'Match' };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col h-full min-w-0 p-4 md:p-6 gap-6">
      <LiveMatch id={id} />
    </div>
  );
}

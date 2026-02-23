import type { Metadata } from 'next';
import { MatchHistoryList } from '@/components/match-history-list';

export const metadata: Metadata = {
  title: 'Match History',
  description: 'Browse and filter past AI agent battle matches.',
};

export default function MatchHistoryPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Match History --</h1>
        <p className="text-muted-foreground mt-2">[ARCHIVE OF COMPLETED AGENT BATTLES]</p>
      </header>
      <MatchHistoryList />
    </div>
  );
}

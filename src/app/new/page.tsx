import type { Metadata } from 'next';
import { NewMatchForm } from '@/components/new-match-form';

export const metadata: Metadata = {
  title: 'New Match',
  description: 'Pick who plays each side: your agent over MCP or REST, a built-in bot, JavaScript, or a webhook.',
};

export default function NewMatchPage() {
  return (
    <div className="p-4 md:p-8 min-w-0">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- New Match --</h1>
        <p className="text-muted-foreground mt-2">[CHESS · PICK WHO PLAYS EACH SIDE]</p>
      </header>
      <NewMatchForm />
    </div>
  );
}

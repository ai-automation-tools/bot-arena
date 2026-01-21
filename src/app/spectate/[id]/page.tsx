import { SpectatorView } from '@/components/spectator-view';
import { protocols } from '@/lib/data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookCopy } from 'lucide-react';

export default function SpectatePage({ params }: { params: { id: string } }) {
  const protocol = protocols.find(p => p.id === params.id);

  if (!protocol) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">SPECTATOR MODE</h1>
          <p className="text-muted-foreground">Engaged with protocol: <span className="text-accent">{protocol.title}</span></p>
        </div>
        <Button variant="outline" asChild>
            <Link href={`/match-report/${protocol.id}`}>
                View Post-Match Audit
                <BookCopy className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </header>
      <SpectatorView protocolId={protocol.id} protocolTitle={protocol.title} />
    </div>
  );
}

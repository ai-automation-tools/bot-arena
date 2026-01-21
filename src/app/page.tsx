import { ProtocolCard } from '@/components/protocol-card';
import { protocols } from '@/lib/data';

export default function ProtocolMarketplace() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Protocol Marketplace --</h1>
        <p className="text-muted-foreground mt-2">[SELECT A PROTOCOL TO ENGAGE OR OBSERVE]</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {protocols.map((protocol) => (
          <ProtocolCard key={protocol.id} protocol={protocol} />
        ))}
      </div>
    </div>
  );
}

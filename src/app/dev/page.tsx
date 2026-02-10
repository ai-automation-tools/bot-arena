import Link from 'next/link';

export default function DevPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-primary">-- Game Templates --</h1>
        <p className="text-muted-foreground mt-2">[SELECT A TEMPLATE TO START DEVELOPING]</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold text-primary">Classic Game</h2>
          <p className="text-muted-foreground mt-2">A classic game template for building turn-based games.</p>
          <Link href="/dev/classic-game">
            <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">Select</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

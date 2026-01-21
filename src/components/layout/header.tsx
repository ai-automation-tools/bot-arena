import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/50 bg-background/90 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <SidebarTrigger className="md:hidden text-primary hover:text-accent"/>
        <div className="flex-1">
          <h1 className="text-lg font-semibold uppercase tracking-widest">
            <span className="text-primary neon-text-cyan">BotArena</span>{' '}
            <span className="text-accent neon-text-green">Retro</span>
          </h1>
        </div>
    </header>
  );
}

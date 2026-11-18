import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/50 bg-background/90 px-4 backdrop-blur-xs sm:h-16 sm:px-6">
        <SidebarTrigger className="md:hidden text-primary hover:text-accent"/>
        <div className="flex-1">
          <p className="text-lg font-semibold uppercase tracking-widest">
            <span className="text-primary neon-text-cyan">Bot</span>{' '}
            <span className="text-accent neon-text-green">Arena</span>
          </p>
        </div>
    </header>
  );
}

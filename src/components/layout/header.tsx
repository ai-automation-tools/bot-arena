import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <SidebarTrigger className="md:hidden"/>
        <div className="flex-1">
          <h1 className="text-lg font-semibold uppercase tracking-widest text-primary/80">
            BotArena <span className="text-accent">Retro</span>
          </h1>
        </div>
    </header>
  );
}

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarContent } from './sidebar-content';
import { Header } from './header';
import { DemoFooter, SourceBar } from './source-bar';
import { cn, IS_DEMO } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        {/* Fixed above the sidebar and the header, so both start 34px down (the bar's height). */}
        {IS_DEMO && <SourceBar />}
        <Sidebar className={IS_DEMO ? 'top-[34px] h-[calc(100svh-34px)]' : undefined}>
            <SidebarContent />
        </Sidebar>
        <SidebarInset className={cn('min-w-0', IS_DEMO && 'pt-[34px]')}>
            <Header />
            <div className="grow">{children}</div>
            {IS_DEMO && <DemoFooter />}
        </SidebarInset>
    </SidebarProvider>
  );
}

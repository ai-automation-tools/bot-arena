import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarContent } from './sidebar-content';
import { Header } from './header';
import { DemoFooter, SourceBar } from './source-bar';
import { IS_DEMO } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        {/* Fixed above the sidebar and the header, so both start 34px down (the bar's height). */}
        <SourceBar />
        <Sidebar className="top-[34px] h-[calc(100svh-34px)]">
            <SidebarContent />
        </Sidebar>
        <SidebarInset className="min-w-0 pt-[34px]">
            <Header />
            <div className="grow">{children}</div>
            {IS_DEMO && <DemoFooter />}
        </SidebarInset>
    </SidebarProvider>
  );
}

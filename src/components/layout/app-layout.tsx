import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarContent } from './sidebar-content';
import { Header } from './header';
import { SourceBar } from './source-bar';
import { IS_DEMO } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarContent />
        </Sidebar>
        <SidebarInset className="min-w-0">
            {IS_DEMO && <SourceBar />}
            <Header />
            <div className="flex-grow">{children}</div>
        </SidebarInset>
    </SidebarProvider>
  );
}

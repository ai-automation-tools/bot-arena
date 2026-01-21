import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarContent } from './sidebar-content';
import { Header } from './header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarContent />
        </Sidebar>
        <SidebarInset>
            <Header />
            <div className="flex-grow">{children}</div>
        </SidebarInset>
    </SidebarProvider>
  );
}

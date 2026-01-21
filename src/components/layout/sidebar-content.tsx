'use client';
import {
  SidebarHeader,
  SidebarContent as SidebarContentArea,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { Bot, Gamepad2, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarContent() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  const isSpectating = pathname.startsWith('/spectate');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Bot className="w-8 h-8 text-accent"/>
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold tracking-widest text-primary">BOTARENA</h2>
                <p className="text-xs text-muted-foreground">v0.1.0_alpha</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContentArea>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref>
              <SidebarMenuButton isActive={isActive('/')} className="text-foreground hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-primary/10">
                <Gamepad2 className="text-primary" />
                <span>Marketplace</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {/* A disabled placeholder for spectating */}
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isSpectating} disabled className="text-foreground data-[active=true]:text-accent data-[active=true]:bg-accent/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Spectating...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContentArea>
      <SidebarSeparator />
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/admin" passHref>
                <SidebarMenuButton isActive={isAdmin} className="text-foreground hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-primary/10">
                    <Shield className="text-yellow-400" />
                    <span>Admin BIOS</span>
                </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton disabled className="text-muted-foreground">
                    <Settings />
                    <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-4 py-2 text-xs text-accent">&gt; SYSTEM STATUS: OPERATIONAL</p>
      </SidebarFooter>
    </>
  );
}

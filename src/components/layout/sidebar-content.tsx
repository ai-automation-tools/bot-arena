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
import { Bot, Gamepad2, Shield, History, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SoundToggle } from "@/components/sound-toggle";

export function SidebarContent() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  const isSpectating = pathname.startsWith('/spectate');
  const isAdmin = pathname.startsWith('/admin');
  const isHistory = pathname.startsWith('/history');
  const isLobby = pathname.startsWith('/lobby');

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Bot className="w-8 h-8 text-green-400"/>
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold tracking-widest text-cyan-400">BOTARENA</h2>
                <p className="text-xs text-slate-400">v0.1.0_alpha</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContentArea>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref>
              <SidebarMenuButton isActive={isActive('/')} className="text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/30 data-[active=true]:text-cyan-100 data-[active=true]:bg-cyan-900/40">
                <Gamepad2 className="text-cyan-400" />
                <span>Marketplace</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/lobby" passHref>
              <SidebarMenuButton isActive={isLobby} className="text-orange-300 hover:text-orange-100 hover:bg-orange-900/30 data-[active=true]:text-orange-100 data-[active=true]:bg-orange-900/40">
                <Swords className="text-orange-400" />
                <span>Arena Lobby</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/history" passHref>
              <SidebarMenuButton isActive={isHistory} className="text-purple-300 hover:text-purple-100 hover:bg-purple-900/30 data-[active=true]:text-purple-100 data-[active=true]:bg-purple-900/40">
                <History className="text-purple-400" />
                <span>Match History</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {/* A disabled placeholder for spectating */}
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isSpectating} disabled className="text-green-300 data-[active=true]:text-green-100 data-[active=true]:bg-green-900/40 disabled:opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
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
                <SidebarMenuButton isActive={isAdmin} className="text-yellow-300 hover:text-yellow-100 hover:bg-yellow-900/30 data-[active=true]:text-yellow-100 data-[active=true]:bg-yellow-900/40">
                    <Shield className="text-yellow-400" />
                    <span>Admin BIOS</span>
                </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-2">
          <SoundToggle />
        </div>
        <p className="px-4 py-2 text-xs text-green-400 font-mono">&gt; SYSTEM STATUS: OPERATIONAL</p>
      </SidebarFooter>
    </>
  );
}

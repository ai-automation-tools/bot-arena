'use client';
import {
  SidebarHeader,
  SidebarContent as SidebarContentArea,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Bot, Gamepad2, Grid3x3, History, Plug, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SoundToggle } from "@/components/sound-toggle";
import { IS_DEMO } from "@/lib/utils";

// The static demo has the replays, the protocol pages and the tic-tac-toe board; the rest need the local server.
const NAV = [
  { href: "/", label: "Arena", icon: Gamepad2, color: "cyan", demo: true },
  { href: "/play", label: "Play Tic-Tac-Toe", icon: Grid3x3, color: "purple", demo: true },
  { href: "/new", label: "New Match", icon: Swords, color: "orange", demo: false },
  { href: "/history", label: "Matches", icon: History, color: "purple", demo: false },
  { href: "/connect", label: "Connect Agents", icon: Plug, color: "green", demo: false },
] as const;

const COLORS = {
  cyan: "text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/30 data-[active=true]:text-cyan-100 data-[active=true]:bg-cyan-900/40 [&>svg]:text-cyan-400",
  orange: "text-orange-300 hover:text-orange-100 hover:bg-orange-900/30 data-[active=true]:text-orange-100 data-[active=true]:bg-orange-900/40 [&>svg]:text-orange-400",
  purple: "text-purple-300 hover:text-purple-100 hover:bg-purple-900/30 data-[active=true]:text-purple-100 data-[active=true]:bg-purple-900/40 [&>svg]:text-purple-400",
  green: "text-green-300 hover:text-green-100 hover:bg-green-900/30 data-[active=true]:text-green-100 data-[active=true]:bg-green-900/40 [&>svg]:text-green-400",
};

export function SidebarContent() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Bot className="w-8 h-8 text-green-400"/>
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold tracking-widest text-cyan-400">BOTARENA</h2>
                <p className="text-xs text-slate-400">{IS_DEMO ? "demo" : "local arena"}</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContentArea>
        <SidebarMenu>
          {NAV.filter((n) => !IS_DEMO || n.demo).map(({ href, label, icon: Icon, color }) => (
            <SidebarMenuItem key={href}>
              <Link href={href} passHref>
                <SidebarMenuButton isActive={isActive(href)} className={COLORS[color]}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContentArea>
      <SidebarFooter>
        <div className="px-2 py-2">
          <SoundToggle />
        </div>
        <p className="px-4 py-2 text-xs text-green-400 font-mono">&gt; SYSTEM STATUS: OPERATIONAL</p>
      </SidebarFooter>
    </>
  );
}

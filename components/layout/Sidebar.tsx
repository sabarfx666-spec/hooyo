"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, BarChart2, ScrollText, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/checklist", label: "Checklist", icon: ClipboardList },
  { href: "/risk", label: "Risk", icon: BarChart2 },
  { href: "/history", label: "History", icon: ScrollText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-[#0D0D0D] border-r border-[#2A2A2A] min-h-screen">
      <div className="p-5 border-b border-[#2A2A2A]">
        <span className="font-mono font-bold text-[#6AECE1] text-lg tracking-widest">◈ SABAR</span>
        <span className="font-mono font-bold text-white text-lg tracking-widest"> SYSTEM</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono transition-colors duration-150",
                active
                  ? "text-[#6AECE1] border-l-2 border-[#6AECE1] bg-[#6AECE1]/5 pl-[10px]"
                  : "text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#2A2A2A]">
        <p className="font-mono text-[#A0A0A0] text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}

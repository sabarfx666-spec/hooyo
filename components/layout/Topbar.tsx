"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { CalendarDays, User, LogOut, ChevronDown, Shield, TrendingUp, BookOpen, Sun, Moon } from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { useSabar } from "@/store/SabarContext";
import { SunriseLogo } from "@/components/SunriseLogo";

const navItems = [
  { href: "/weekly",  label: "Weekly Outlook", icon: TrendingUp },
  { href: "/history", label: "Journal",        icon: BookOpen   },
];

function DatePickerButton() {
  const { state, dispatch } = useSabar();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isToday = state.selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="relative">
      <button
        onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:border-[#EF4444]"
        style={{
          background: "#141414",
          border: `1px solid ${isToday ? "#2A2A2A" : "#EF4444"}`,
        }}
        title="Click to change journal date"
      >
        <CalendarDays size={15} strokeWidth={2} style={{ color: isToday ? "#C0C0C0" : "#EF4444" }} />
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={state.selectedDate}
        onChange={e => {
          if (e.target.value) dispatch({ type: "SET_DATE", payload: e.target.value });
        }}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        style={{ top: "100%", left: 0 }}
      />
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-sans text-white transition-all hover:opacity-90"
        style={{ background: "#EF4444", boxShadow: "0 0 14px 2px rgba(239,68,68,0.35)" }}
      >
        <User size={14} strokeWidth={2.5} />
        Login
      </Link>
    );
  }

  const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold font-sans transition-all hover:opacity-90"
        style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
      >
        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
          style={{ background: "#EF4444", color: "#fff" }}
        >
          {initials}
        </div>
        <span className="text-white max-w-[80px] truncate">{user.name}</span>
        <ChevronDown size={11} className="text-[#666]" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50"
          style={{ background: "#111", border: "1px solid #2A2A2A", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
        >
          <div className="px-4 py-3 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-white truncate">{user.name}</p>
              {user.role === "admin" && (
                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>ADMIN</span>
              )}
            </div>
          </div>
          {user.role === "admin" && (
            <button
              onClick={() => { setOpen(false); router.push("/admin"); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-sans text-[#EF4444] hover:bg-[#1A1A1A] transition-colors border-b border-[#1A1A1A]"
            >
              <Shield size={14} />
              User Management
            </button>
          )}
          <button
            onClick={() => { logout(); setOpen(false); router.push("/login"); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-sans text-[#FF3B3B] hover:bg-[#1A1A1A] transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const HIDDEN_PATHS = ["/login", "/home", "/contact"];

function DarkModeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sabar-theme");
    const isDark = saved !== "light";
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("sabar-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
      style={{ background: "#141414", border: "1px solid #2A2A2A", color: dark ? "#F59E0B" : "#6AECE1" }}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export function Topbar() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3"
      style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(8px)" }}>

      {/* Brand — links to dashboard */}
      <Link href="/" className="flex items-center gap-3 min-w-0 group">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.45)",
            boxShadow: "0 0 16px 2px rgba(245,158,11,0.22)",
          }}
        >
          <SunriseLogo size={36} />
        </div>
        <div className="min-w-0">
          <p
            className="font-sans text-2xl font-black leading-none"
            style={{ color: "#EF4444", textShadow: "0 0 18px rgba(239,68,68,0.45)" }}
          >
            A+
          </p>
          <p className="font-sans text-xs mt-0.5 truncate" style={{ color: "#8A8A8A" }}>
            Confirm your trade setup before entry
          </p>
        </div>
      </Link>

      {/* Right: theme + nav + date + user */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <DarkModeToggle />
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-sans font-semibold transition-all duration-150"
              style={{
                color: active ? "#EF4444" : "#C0C0C0",
                background: active ? "rgba(239,68,68,0.08)" : "transparent",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
        <DatePickerButton />
        <UserMenu />
      </div>

    </header>
  );
}

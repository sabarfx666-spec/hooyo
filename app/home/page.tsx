"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, BarChart2, Shield, BookOpen, ChevronRight, Users } from "lucide-react";

function LandingNav() {
  return (
    <nav className="flex items-center justify-between px-8 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.4)" }}>
          <TrendingUp size={18} style={{ color: "#E53E3E" }} />
        </div>
        <span className="font-mono font-bold text-white text-lg tracking-wide">
          <span style={{ color: "#E53E3E" }}>Sabar</span> System
        </span>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/home" className="font-sans text-sm font-semibold text-white border-b-2 pb-0.5"
          style={{ borderColor: "#E53E3E" }}>Home</Link>
        <Link href="/contact" className="font-sans text-sm font-semibold text-[#666] hover:text-white transition-colors">Contact</Link>
      </div>

      <Link href="/login"
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
        style={{ background: "#E53E3E", boxShadow: "0 0 16px 4px rgba(229,62,62,0.3)" }}>
        Login
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </Link>
    </nav>
  );
}

export default function HomePage() {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <LandingNav />

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0d0d0d 0%, #000 100%)" }}>
        {/* bg glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(229,62,62,0.12) 0%, transparent 70%)"
        }} />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 font-mono text-xs font-bold uppercase tracking-widest"
          style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.3)", color: "#E53E3E" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#E53E3E] animate-pulse" />
          Forex Trading Journal
        </div>

        <h1 className="font-sans font-black text-5xl md:text-6xl text-white mb-4 leading-tight">
          Trade With<br />
          <span style={{ color: "#E53E3E" }}>Discipline</span>
        </h1>
        <p className="font-sans text-[#666] text-lg max-w-md mb-10">
          A professional trading journal built for serious forex traders. Track your bias, manage risk, and stay disciplined.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/login"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105"
            style={{ background: "#E53E3E", boxShadow: "0 0 24px 6px rgba(229,62,62,0.35)" }}>
            Get Started <ChevronRight size={16} />
          </Link>
          <Link href="/contact"
            className="px-8 py-3.5 rounded-full text-sm font-bold transition-all hover:text-white"
            style={{ border: "1px solid #2a2a2a", color: "#666" }}>
            Contact Us
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-20 max-w-5xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#444] text-center mb-12">What's inside</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: BarChart2, color: "#00FF7F", bg: "rgba(0,255,127,0.08)", border: "rgba(0,255,127,0.2)",
              title: "Risk Management", desc: "Position sizer, drawdown monitor, and daily risk rules to protect your account." },
            { icon: BookOpen, color: "#6AECE1", bg: "rgba(106,236,225,0.08)", border: "rgba(106,236,225,0.2)",
              title: "Daily Journal", desc: "Log bias, session, pairs, and psychology before every trade." },
            { icon: Shield, color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",
              title: "Trade Checklist", desc: "HTF Bias & LTF Entry Model rule checklists to keep you accountable." },
            { icon: Users, color: "#E53E3E", bg: "rgba(229,62,62,0.08)", border: "rgba(229,62,62,0.2)",
              title: "User Access Control", desc: "Admin-approved access. You control who joins your trading system." },
          ].map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div key={title} className="flex gap-4 p-5 rounded-2xl transition-all hover:scale-[1.01]"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${bg}`, border: `1px solid ${border}` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="font-mono font-bold text-white text-sm mb-1">{title}</p>
                <p className="font-sans text-xs text-[#555] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center px-6 py-16" style={{ borderTop: "1px solid #111" }}>
        <p className="font-sans text-[#444] text-sm mb-6">Ready to trade with discipline?</p>
        <Link href="/login"
          className="inline-flex items-center gap-2 px-10 py-3.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: "#E53E3E", boxShadow: "0 0 24px 6px rgba(229,62,62,0.3)" }}>
          Login to Sabar System <ChevronRight size={16} />
        </Link>
        <p className="font-mono text-[10px] text-[#333] mt-6 uppercase tracking-widest">
          © 2025 Sabar System · All rights reserved
        </p>
      </div>
    </div>
  );
}

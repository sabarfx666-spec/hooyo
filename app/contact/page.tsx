"use client";
import Link from "next/link";
import { TrendingUp, MapPin, Mail, Phone, MessageCircle, Send } from "lucide-react";

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
        <Link href="/home" className="font-sans text-sm font-semibold text-[#666] hover:text-white transition-colors">Home</Link>
        <Link href="/contact" className="font-sans text-sm font-semibold text-white border-b-2 pb-0.5"
          style={{ borderColor: "#E53E3E" }}>Contact</Link>
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

export default function ContactPage() {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <LandingNav />

      {/* Hero banner */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0d0d0d 0%, #000 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(229,62,62,0.1) 0%, transparent 70%)"
        }} />
        <h1 className="font-sans font-black text-5xl md:text-6xl text-white relative z-10">Contact</h1>
        <p className="font-sans text-[#555] text-base mt-3 relative z-10">Get in touch with the Sabar System team</p>
      </div>

      {/* Contact cards */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            {
              icon: MapPin, color: "#E53E3E", bg: "rgba(229,62,62,0.08)", border: "rgba(229,62,62,0.2)",
              label: "Location", value: "Mogadishu, Somalia",
            },
            {
              icon: Mail, color: "#6AECE1", bg: "rgba(106,236,225,0.08)", border: "rgba(106,236,225,0.2)",
              label: "Email", value: "sabarfx666@gmail.com",
            },
            {
              icon: Phone, color: "#00FF7F", bg: "rgba(0,255,127,0.08)", border: "rgba(0,255,127,0.2)",
              label: "Phone", value: "+252 683 513 639",
            },
          ].map(({ icon: Icon, color, bg, border, label, value }) => (
            <div key={label} className="flex flex-col items-center text-center p-8 rounded-2xl transition-all hover:scale-[1.02]"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon size={24} style={{ color }} />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-2">{label}</p>
              <p className="font-sans font-bold text-white text-sm">{value}</p>
            </div>
          ))}
        </div>

        {/* Social / Message channels */}
        <div style={{ borderTop: "1px solid #111" }} className="pt-12">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#444] text-center mb-8">Message us directly</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            {/* WhatsApp */}
            <a href="https://wa.me/252683513639" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:scale-105"
              style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="font-mono text-xs font-bold" style={{ color: "#25D366" }}>WhatsApp</p>
                <p className="font-sans text-[11px] text-[#555]">+252 683 513 639</p>
              </div>
            </a>

            {/* Telegram */}
            <a href="https://t.me/sabarfx" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:scale-105"
              style={{ background: "rgba(40,167,235,0.08)", border: "1px solid rgba(40,167,235,0.25)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(40,167,235,0.15)", border: "1px solid rgba(40,167,235,0.3)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#29A8EB">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <p className="font-mono text-xs font-bold" style={{ color: "#29A8EB" }}>Telegram</p>
                <p className="font-sans text-[11px] text-[#555]">@sabarfx</p>
              </div>
            </a>

            {/* Email */}
            <a href="mailto:sabarfx666@gmail.com"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:scale-105"
              style={{ background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.25)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)" }}>
                <Send size={16} style={{ color: "#E53E3E" }} />
              </div>
              <div>
                <p className="font-mono text-xs font-bold" style={{ color: "#E53E3E" }}>Email</p>
                <p className="font-sans text-[11px] text-[#555]">sabarfx666@gmail.com</p>
              </div>
            </a>

          </div>
        </div>
      </div>

      <div className="text-center py-8" style={{ borderTop: "1px solid #111" }}>
        <p className="font-mono text-[10px] text-[#333] uppercase tracking-widest">
          © 2025 Sabar System · All rights reserved
        </p>
      </div>
    </div>
  );
}

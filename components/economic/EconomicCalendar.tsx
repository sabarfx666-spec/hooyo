"use client";
import { useState, useEffect, useMemo } from "react";
import { Clock, Volume2, Bell, BellOff, Play, ChevronDown, Search } from "lucide-react";

type Impact = "HIGH" | "MEDIUM" | "LOW";
type Status = "PENDING" | "RELEASED";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  impact: Impact;
  eventName: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  status: Status;
  actualColor?: "red" | "green" | "yellow";
}

const SEED_EVENTS: EconomicEvent[] = [
  { id:"1", date:"Mon Jun 16", time:"9:00am",  currency:"GBP", impact:"HIGH",   eventName:"CPI y/y (Consumer Price Index)",  actual:"2.8%",    forecast:"3.0%",      previous:"2.8%",  status:"RELEASED", actualColor:"red"   },
  { id:"2", date:"Mon Jun 16", time:"9:00pm",  currency:"USD", impact:"HIGH",   eventName:"Federal Funds Rate",              actual:undefined, forecast:"3.75%",     previous:"3.75%", status:"PENDING"  },
  { id:"3", date:"Mon Jun 16", time:"9:00pm",  currency:"USD", impact:"HIGH",   eventName:"FOMC Economic Projections",       actual:undefined, forecast:"Statement", previous:undefined,status:"PENDING"  },
  { id:"4", date:"Mon Jun 16", time:"9:00pm",  currency:"USD", impact:"HIGH",   eventName:"FOMC Statement",                  actual:undefined, forecast:"Hawkish",   previous:undefined,status:"PENDING"  },
  { id:"5", date:"Mon Jun 16", time:"9:30pm",  currency:"USD", impact:"HIGH",   eventName:"FOMC Press Conference",           actual:undefined, forecast:"Live",      previous:undefined,status:"PENDING"  },
  { id:"6", date:"Mon Jun 16", time:"10:30am", currency:"USD", impact:"MEDIUM", eventName:"Crude Oil Inventories",           actual:"-2.1M",   forecast:"-1.5M",     previous:"1.2M",  status:"RELEASED", actualColor:"green" },
  { id:"7", date:"Mon Jun 16", time:"1:45pm",  currency:"EUR", impact:"MEDIUM", eventName:"ECB President Lagarde Speaks",    actual:"Speaks",  forecast:undefined,   previous:undefined,status:"RELEASED", actualColor:"yellow"},
  { id:"8", date:"Tue Jun 17", time:"8:30am",  currency:"USD", impact:"HIGH",   eventName:"Core Retail Sales m/m",           actual:undefined, forecast:"0.3%",      previous:"-0.1%", status:"PENDING"  },
  { id:"9", date:"Tue Jun 17", time:"8:30am",  currency:"USD", impact:"HIGH",   eventName:"Retail Sales m/m",                actual:undefined, forecast:"0.2%",      previous:"-0.9%", status:"PENDING"  },
  { id:"10",date:"Tue Jun 17", time:"10:00am", currency:"USD", impact:"MEDIUM", eventName:"Business Inventories m/m",        actual:undefined, forecast:"0.3%",      previous:"0.2%",  status:"PENDING"  },
  { id:"11",date:"Tue Jun 17", time:"10:00am", currency:"USD", impact:"MEDIUM", eventName:"NAHB Housing Market Index",       actual:undefined, forecast:"44",        previous:"45",    status:"PENDING"  },
  { id:"12",date:"Wed Jun 18", time:"8:30am",  currency:"USD", impact:"HIGH",   eventName:"Building Permits",                actual:undefined, forecast:"1.38M",     previous:"1.42M", status:"PENDING"  },
  { id:"13",date:"Wed Jun 18", time:"8:30am",  currency:"USD", impact:"HIGH",   eventName:"Housing Starts",                  actual:undefined, forecast:"1.36M",     previous:"1.36M", status:"PENDING"  },
  { id:"14",date:"Wed Jun 18", time:"2:00pm",  currency:"USD", impact:"MEDIUM", eventName:"Beige Book",                      actual:undefined, forecast:undefined,   previous:undefined,status:"PENDING"  },
  { id:"15",date:"Thu Jun 19", time:"8:30am",  currency:"USD", impact:"HIGH",   eventName:"Unemployment Claims",             actual:undefined, forecast:"238K",      previous:"242K",  status:"PENDING"  },
  { id:"16",date:"Thu Jun 19", time:"8:30am",  currency:"EUR", impact:"HIGH",   eventName:"ECB Monetary Policy Statement",   actual:undefined, forecast:undefined,   previous:undefined,status:"PENDING"  },
  { id:"17",date:"Thu Jun 19", time:"1:00pm",  currency:"GBP", impact:"HIGH",   eventName:"BOE Interest Rate Decision",      actual:undefined, forecast:"4.25%",     previous:"4.25%", status:"PENDING"  },
  { id:"18",date:"Fri Jun 20", time:"8:30am",  currency:"CAD", impact:"HIGH",   eventName:"Core CPI m/m",                    actual:undefined, forecast:"0.2%",      previous:"0.1%",  status:"PENDING"  },
  { id:"19",date:"Fri Jun 20", time:"3:00pm",  currency:"USD", impact:"MEDIUM", eventName:"Fed Monetary Policy Report",      actual:undefined, forecast:undefined,   previous:undefined,status:"PENDING"  },
];

const CURRENCIES = ["All Currencies", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"];
const IMPACTS    = ["All Impacts", "HIGH", "MEDIUM", "LOW"];

const impactColor: Record<Impact, string> = { HIGH: "#FF3B3B", MEDIUM: "#F59E0B", LOW: "#6AECE1" };

export function EconomicCalendar() {
  const [now, setNow] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({ "2":true, "5":true });
  const [query, setQuery]   = useState("");
  const [currFilter, setCurrFilter] = useState("All Currencies");
  const [impFilter,  setImpFilter]  = useState("All Impacts");
  const [currOpen,   setCurrOpen]   = useState(false);
  const [impOpen,    setImpOpen]    = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clockStr = now ? now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true }) : "--:--:--";
  const dateStr  = now ? now.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }) : "---";
  const offset   = now ? -(now.getTimezoneOffset() / 60) : 0;
  const gmtStr   = now ? `GMT ${offset >= 0 ? "+" : ""}${offset}:00` : "GMT";

  const filtered = useMemo(() => SEED_EVENTS.filter((e) => {
    if (currFilter !== "All Currencies" && e.currency !== currFilter) return false;
    if (impFilter  !== "All Impacts"    && e.impact   !== impFilter)  return false;
    if (query && !e.eventName.toLowerCase().includes(query.toLowerCase()) && !e.currency.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [currFilter, impFilter, query]);

  const toggleAlert = (id: string) =>
    setAlerts((a) => ({ ...a, [id]: !a[id] }));

  const actualColorMap: Record<string, string> = { red: "#FF3B3B", green: "#00FF7F", yellow: "#F59E0B" };

  let lastDate = "";

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "#0A0F1A", border: "1px solid #1A2236" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1A2236", background: "#0D1420" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(106,236,225,0.1)", border: "1px solid rgba(106,236,225,0.2)" }}>
            <Clock size={15} style={{ color: "#6AECE1" }} />
          </div>
          <div>
            <p className="font-mono font-bold text-sm tracking-widest uppercase text-white">Economic Event Journal</p>
            <p className="font-sans text-[11px] mt-0.5" style={{ color: "#4A6080" }}>
              Session Date: <span style={{ color: "#6AECE1" }}>{dateStr}</span>
              {" • "}Platform Clock: <span style={{ color: "#6AECE1" }}>{clockStr}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1A2236] transition-colors" style={{ border: "1px solid #1A2236" }}>
            <Volume2 size={14} style={{ color: "#4A6080" }} />
          </button>
          <div className="px-3 py-1.5 rounded-lg font-mono text-sm font-bold" style={{ background: "#1A2236", color: "#6AECE1", border: "1px solid #243050" }}>
            {gmtStr}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#1A2236", background: "#0D1420" }}>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#111827", border: "1px solid #1A2236" }}>
          <Search size={13} style={{ color: "#4A6080" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by event detail or keyword..."
            className="flex-1 bg-transparent font-sans text-sm text-white placeholder-[#2A3A50] focus:outline-none"
          />
        </div>
        {/* Currency dropdown */}
        <div className="relative">
          <button
            onClick={() => { setCurrOpen((v) => !v); setImpOpen(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold text-white transition-colors hover:bg-[#1A2236]"
            style={{ background: "#111827", border: "1px solid #1A2236" }}
          >
            {currFilter} <ChevronDown size={13} style={{ color: "#4A6080" }} />
          </button>
          {currOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden min-w-[160px]" style={{ background: "#111827", border: "1px solid #1A2236" }}>
              {CURRENCIES.map((c) => (
                <button key={c} onClick={() => { setCurrFilter(c); setCurrOpen(false); }}
                  className="w-full text-left px-4 py-2 font-mono text-xs hover:bg-[#1A2236] transition-colors"
                  style={{ color: c === currFilter ? "#6AECE1" : "#8A9AB0" }}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Impact dropdown */}
        <div className="relative">
          <button
            onClick={() => { setImpOpen((v) => !v); setCurrOpen(false); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold text-white transition-colors hover:bg-[#1A2236]"
            style={{ background: "#111827", border: "1px solid #1A2236" }}
          >
            {impFilter} <ChevronDown size={13} style={{ color: "#4A6080" }} />
          </button>
          {impOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg overflow-hidden min-w-[140px]" style={{ background: "#111827", border: "1px solid #1A2236" }}>
              {IMPACTS.map((i) => (
                <button key={i} onClick={() => { setImpFilter(i); setImpOpen(false); }}
                  className="w-full text-left px-4 py-2 font-mono text-xs hover:bg-[#1A2236] transition-colors"
                  style={{ color: i === impFilter ? "#6AECE1" : "#8A9AB0" }}>
                  {i}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table header ── */}
      <div className="grid px-5 py-2.5 border-b" style={{
        gridTemplateColumns: "120px 90px 90px 70px 1fr 70px 110px 110px 110px 110px",
        borderColor: "#1A2236",
        background: "#0D1420",
      }}>
        {["DATE","TIME","CURRENCY","IMPACT","EVENT DETAIL","ALERTS","ACTUAL","FORECAST","PREVIOUS","SIMULATE"].map((h) => (
          <span key={h} className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "#2A4060" }}>{h}</span>
        ))}
      </div>

      {/* ── Rows ── */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <span className="font-mono text-sm text-[#2A3A50]">No events match your filters</span>
          </div>
        ) : (
          filtered.map((ev, idx) => {
            const showDate = ev.date !== lastDate;
            if (showDate) lastDate = ev.date;
            return (
              <div key={ev.id}>
                <div
                  className="grid px-5 py-3.5 group transition-colors hover:bg-[#111827] border-b"
                  style={{
                    gridTemplateColumns: "120px 90px 90px 70px 1fr 70px 110px 110px 110px 110px",
                    borderColor: "#111827",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  {/* DATE */}
                  <span className="font-mono text-xs" style={{ color: "#4A6080" }}>
                    {showDate ? ev.date : ""}
                  </span>

                  {/* TIME */}
                  <span className="font-mono text-xs font-bold" style={{
                    color: ev.time.includes("am") ? "#F59E0B" : "#FF6B6B",
                  }}>
                    {ev.time}
                  </span>

                  {/* CURRENCY */}
                  <span className="font-mono text-xs font-bold text-white">{ev.currency}</span>

                  {/* IMPACT icon */}
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: impactColor[ev.impact] + "33" }}>
                      <div className="w-2 h-2 rounded-sm" style={{ background: impactColor[ev.impact] }} />
                    </div>
                  </div>

                  {/* EVENT NAME */}
                  <span className="font-sans text-sm font-medium text-white pr-4">{ev.eventName}</span>

                  {/* ALERTS bell */}
                  <button onClick={() => toggleAlert(ev.id)} className="flex items-center">
                    {alerts[ev.id]
                      ? <Bell size={14} style={{ color: "#F59E0B" }} />
                      : <BellOff size={14} style={{ color: "#2A3A50" }} />}
                  </button>

                  {/* ACTUAL */}
                  <span className="font-mono text-xs font-bold" style={{
                    color: ev.status === "PENDING"
                      ? "#4A6080"
                      : ev.actualColor ? actualColorMap[ev.actualColor] : "#8A9AB0",
                  }}>
                    {ev.status === "PENDING" ? "Pending" : ev.actual ?? "—"}
                  </span>

                  {/* FORECAST */}
                  <span className="font-mono text-xs" style={{ color: "#4A6080" }}>
                    {ev.forecast ?? "———"}
                  </span>

                  {/* PREVIOUS */}
                  <span className="font-mono text-xs" style={{ color: "#4A6080" }}>
                    {ev.previous ?? "———"}
                  </span>

                  {/* SIMULATE / RELEASED */}
                  {ev.status === "PENDING" ? (
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11px] font-bold transition-all hover:opacity-90"
                      style={{ background: "#1A3A6A", border: "1px solid #2A4A80", color: "#6AECE1" }}
                    >
                      <Play size={10} fill="#6AECE1" />
                      TRIGGER
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11px]"
                      style={{ background: "#1A2030", border: "1px solid #1A2236", color: "#2A4060" }}
                    >
                      <Play size={10} />
                      RELEASED
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

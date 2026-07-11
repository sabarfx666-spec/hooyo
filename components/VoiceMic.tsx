"use client";
import { useRef, useState } from "react";
import { Mic } from "lucide-react";

/**
 * Speech-to-text button for note fields. Speaks Somali (default) or English.
 * Calls onText with each recognized phrase — parent appends it to its note state.
 */
export function VoiceMic({ onText }: { onText: (text: string) => void }) {
  const [on, setOn]     = useState(false);
  const [lang, setLang] = useState<"so-SO" | "en-US">("so-SO");
  const [err, setErr]   = useState<string | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  // Keep latest callback so long recordings append to fresh state, not a stale closure
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const toggle = () => {
    if (on) { recRef.current?.stop(); return; }
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
            ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) { setErr("Voice not supported"); setTimeout(() => setErr(null), 3000); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new (SR as any)();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>).slice(e.resultIndex)
        .map((r: any) => r[0].transcript).join(" ").trim();
      if (text) onTextRef.current(text);
    };
    rec.onend = () => setOn(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      setOn(false);
      setErr(e.error === "not-allowed" ? "Mic blocked — click Allow in browser" : `Voice error: ${e.error}`);
      setTimeout(() => setErr(null), 3500);
    };
    recRef.current = rec;
    rec.start();
    setOn(true);
    setErr(null);
  };

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      {err && <span className="font-mono text-[9px]" style={{ color: "#FF3B3B" }}>{err}</span>}
      {on && !err && <span className="font-mono text-[9px]" style={{ color: "#FF3B3B" }}>● Listening…</span>}
      <button type="button"
        onClick={() => { recRef.current?.stop(); setLang(l => (l === "so-SO" ? "en-US" : "so-SO")); }}
        title="Switch voice language"
        className="px-1.5 py-1 rounded-md font-mono text-[9px] font-bold transition-all"
        style={{ border: "1px solid #2A2A2A", color: "#666", background: "transparent" }}>
        {lang === "so-SO" ? "SO" : "EN"}
      </button>
      <button type="button" onClick={toggle} title={on ? "Stop recording" : "Speak your note"}
        className="p-1.5 rounded-md transition-all"
        style={on
          ? { background: "rgba(255,59,59,0.15)", border: "1px solid #FF3B3B", color: "#FF3B3B" }
          : { background: "transparent", border: "1px solid #2A2A2A", color: "#666" }}>
        <Mic size={12} />
      </button>
    </span>
  );
}

/** Append a spoken phrase to an existing note string. */
export function appendNote(old: string | undefined, text: string) {
  return ((old ?? "").trimEnd() + " " + text).trim();
}

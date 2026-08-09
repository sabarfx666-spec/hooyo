"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import { imgSave, imgLoad, imgDelete } from "@/lib/db";

const META_KEY = "sabar-voice-clips";
const VIOLET = "#7C6BF5";
const BARS = 34;

interface Clip {
  id: string;
  seconds: number;
  peaks: number[];   // 0..1 waveform samples, drawn as bars
}

/** All clips, grouped by the note field they belong to. */
type ClipsByField = Record<string, Clip[]>;

const clipAudioKey = (id: string) => `voice_${id}`;

const readMeta = (): ClipsByField => {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? "{}"); } catch { return {}; }
};
const writeMeta = (m: ClipsByField) => {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch {}
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Decode the recording and reduce it to a handful of peaks for the waveform. */
async function analyse(blob: Blob): Promise<{ seconds: number; peaks: number[] }> {
  try {
    const Ctx = (window.AudioContext ?? (window as unknown as Record<string, unknown>).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / BARS));
    const peaks: number[] = [];
    for (let i = 0; i < BARS; i++) {
      let peak = 0;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[i * step + j] ?? 0);
        if (v > peak) peak = v;
      }
      peaks.push(peak);
    }
    const max = Math.max(...peaks, 0.01);
    ctx.close();
    return { seconds: buf.duration, peaks: peaks.map(p => p / max) };
  } catch {
    // Decoding can fail on some codecs — fall back to a flat bar pattern
    return { seconds: 0, peaks: Array(BARS).fill(0.4) };
  }
}

/**
 * Record short voice notes against a note field. Clips are listed underneath
 * with a play button, waveform and duration.
 */
export function VoiceNote({ fieldKey }: { fieldKey: string }) {
  const [clips, setClips]       = useState<Clip[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);          // 0..1 of the playing clip
  const [err, setErr]           = useState<string | null>(null);

  const recRef   = useRef<MediaRecorder | null>(null);
  const chunks   = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { setClips(readMeta()[fieldKey] ?? []); }, [fieldKey]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioRef.current?.pause();
  }, []);

  const saveClips = (next: Clip[]) => {
    setClips(next);
    const meta = readMeta();
    meta[fieldKey] = next;
    writeMeta(meta);
  };

  /* ── recording ── */
  const start = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const { seconds, peaks } = await analyse(blob);

        const id = `v-${Date.now()}`;
        const reader = new FileReader();
        reader.onload = () => {
          imgSave(clipAudioKey(id), reader.result as string).catch(() => {});
          saveClips([...readMeta()[fieldKey] ?? [], { id, seconds: seconds || elapsed, peaks }]);
        };
        reader.readAsDataURL(blob);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      setErr("Mic blocked — allow microphone access");
      setTimeout(() => setErr(null), 3500);
    }
  };

  const stop = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  /* ── playback ── */
  const play = async (clip: Clip) => {
    if (playingId === clip.id) {           // pause the one that's playing
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const src = await imgLoad(clipAudioKey(clip.id)).catch(() => null);
    if (!src) { setErr("Clip missing"); setTimeout(() => setErr(null), 2500); return; }

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.ontimeupdate = () =>
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    audio.onended = () => { setPlayingId(null); setProgress(0); };
    await audio.play().catch(() => setErr("Could not play clip"));
    setPlayingId(clip.id);
  };

  const remove = (id: string) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
    imgDelete(clipAudioKey(id)).catch(() => {});
    saveClips(clips.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-2">
      {/* record button */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={recording ? stop : start}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-sans text-sm font-semibold transition-all hover:opacity-90"
          style={recording
            ? { background: "rgba(239,68,68,0.15)", border: "1px solid #EF4444", color: "#EF4444" }
            : { background: "rgba(124,107,245,0.10)", border: `1px solid ${VIOLET}55`, color: VIOLET }}>
          {recording ? <Square size={14} /> : <Mic size={14} />}
          {recording ? `Stop · ${fmt(elapsed)}` : "Voice note"}
        </button>
        {err && <span className="font-sans text-[11px]" style={{ color: "#EF4444" }}>{err}</span>}
      </div>

      {/* recorded clips */}
      {clips.map(clip => {
        const isPlaying = playingId === clip.id;
        return (
          <div key={clip.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #262626" }}>
            <button type="button" onClick={() => play(clip)}
              title={isPlaying ? "Pause" : "Play"}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all hover:opacity-90"
              style={{ background: VIOLET, color: "#fff" }}>
              {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
            </button>

            {/* waveform — bars ahead of the playhead stay dim */}
            <div className="flex-1 flex items-center gap-[3px] h-8 overflow-hidden">
              {clip.peaks.map((p, i) => {
                const played = isPlaying && i / clip.peaks.length <= progress;
                return (
                  <span key={i} className="rounded-full"
                    style={{
                      width: 3,
                      height: `${Math.max(12, p * 100)}%`,
                      background: played ? VIOLET : "#4A4A5A",
                      transition: "background 0.1s",
                    }} />
                );
              })}
            </div>

            <span className="font-sans text-xs shrink-0" style={{ color: "#8A8A8A" }}>
              {fmt(clip.seconds)}
            </span>
            <button type="button" onClick={() => remove(clip.id)} title="Delete clip"
              className="shrink-0 text-[#666] hover:text-[#EF4444] transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

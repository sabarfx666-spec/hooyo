"use client";
import { useEffect, useState } from "react";
import { imgPendingUploads } from "@/lib/db";
import { CloudUpload } from "lucide-react";

/**
 * Shows a warning chip while chart images are still uploading to the cloud,
 * and blocks accidental tab-close during an upload. Closing the page (or
 * clearing the browser) mid-upload is how images get lost.
 */
export function CloudStatus() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setPending(imgPendingUploads()), 400);
    const warn = (e: BeforeUnloadEvent) => {
      if (imgPendingUploads() > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => { clearInterval(iv); window.removeEventListener("beforeunload", warn); };
  }, []);

  if (pending === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl"
      style={{ background: "#0D0D0D", border: "1px solid rgba(245,166,35,0.4)" }}>
      <CloudUpload size={14} className="animate-pulse" style={{ color: "#F5A623" }} />
      <span className="font-mono text-[11px] font-bold" style={{ color: "#F5A623" }}>
        Saving {pending} image{pending > 1 ? "s" : ""} to cloud — keep this page open…
      </span>
    </div>
  );
}

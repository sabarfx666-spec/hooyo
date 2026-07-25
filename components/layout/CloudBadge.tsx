"use client";
import { useState } from "react";
import { Cloud } from "lucide-react";

/**
 * Small left-edge badge that reassures the user their trades auto-sync.
 * Shows the full message as a tooltip on hover.
 */
export function CloudBadge() {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="fixed left-0 z-40"
      style={{ top: "calc(50% + 58px)" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative flex items-center">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-r-xl transition-all"
          style={{
            background: "rgba(229,62,62,0.15)",
            border: "1px solid rgba(229,62,62,0.4)",
            borderLeft: "none",
            boxShadow: "2px 0 12px rgba(229,62,62,0.2)",
          }}
        >
          <Cloud size={18} style={{ color: "#E53E3E" }} />
        </div>

        {/* Tooltip */}
        {hover && (
          <span
            className="absolute left-12 whitespace-nowrap px-3 py-2 rounded-xl font-sans text-xs anim-fade-up"
            style={{
              background: "#161616",
              border: "1px solid #2A2A2A",
              color: "#C0C0C0",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            Trades are saved to the cloud automatically
          </span>
        )}
      </div>
    </div>
  );
}

"use client";
import { cn } from "@/lib/utils";

interface ToggleProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (val: T) => void;
  activeColor?: string;
}

export function Toggle<T extends string>({ options, value, onChange, activeColor = "#6AECE1" }: ToggleProps<T>) {
  return (
    <div className="flex rounded overflow-hidden border border-[#2A2A2A]">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2 text-sm font-mono font-semibold transition-colors duration-150",
              isActive
                ? "text-black"
                : "bg-[#0D0D0D] text-[#A0A0A0] hover:text-white"
            )}
            style={isActive ? { backgroundColor: activeColor, color: "#000" } : {}}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

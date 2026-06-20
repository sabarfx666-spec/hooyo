"use client";
import { ButtonHTMLAttributes, CSSProperties, useRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "take" | "skip" | "ghost" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, string> = {
  primary:   "bg-[#6AECE1] text-black hover:bg-[#50d4ca] font-semibold",
  take:      "bg-[#00FF7F] text-black font-bold tracking-widest",
  skip:      "bg-[#FF3B3B] text-white font-bold tracking-widest",
  ghost:     "bg-transparent border border-[#2A2A2A] text-[#A0A0A0] hover:border-[#6AECE1] hover:text-white",
  secondary: "bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] border border-[#2A2A2A]",
};

const variantGlow: Partial<Record<Variant, CSSProperties>> = {
  take: { boxShadow: "0 0 18px 4px rgba(0,255,127,0.55), 0 0 40px 8px rgba(0,255,127,0.25)" },
  skip: { boxShadow: "0 0 18px 4px rgba(255,59,59,0.55),  0 0 40px 8px rgba(255,59,59,0.25)"  },
};

const rippleColor: Partial<Record<Variant, string>> = {
  take:      "rgba(255,255,255,0.5)",
  skip:      "rgba(255,255,255,0.4)",
  primary:   "rgba(0,0,0,0.2)",
  ghost:     "rgba(106,236,225,0.3)",
  secondary: "rgba(255,255,255,0.15)",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({ variant = "primary", size = "md", className, style, onClick, children, ...props }: ButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = btnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `
        position:absolute;
        left:${x - size / 2}px;
        top:${y - size / 2}px;
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${rippleColor[variant] ?? "rgba(255,255,255,0.3)"};
        transform:scale(0);
        animation:ripple-burst 0.55s cubic-bezier(0.4,0,0.2,1) forwards;
        pointer-events:none;
      `;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
    onClick?.(e);
  }

  return (
    <button
      ref={btnRef}
      className={cn(
        "font-mono rounded transition-all duration-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden relative",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      style={{ ...variantGlow[variant], ...style }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

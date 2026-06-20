import { cn } from "@/lib/utils";

type BadgeVariant = "win" | "loss" | "be" | "skip" | "take" | "warning" | "info" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  win: "bg-[#00FF7F]/10 text-[#00FF7F] border border-[#00FF7F]/30",
  loss: "bg-[#FF3B3B]/10 text-[#FF3B3B] border border-[#FF3B3B]/30",
  be: "bg-[#6AECE1]/10 text-[#6AECE1] border border-[#6AECE1]/30",
  skip: "bg-[#A0A0A0]/10 text-[#A0A0A0] border border-[#A0A0A0]/30",
  take: "bg-[#00FF7F]/10 text-[#00FF7F] border border-[#00FF7F]/30",
  warning: "bg-[#FF3B3B]/10 text-[#FF3B3B] border border-[#FF3B3B]/30",
  info: "bg-[#6AECE1]/10 text-[#6AECE1] border border-[#6AECE1]/30",
  default: "bg-[#1A1A1A] text-[#A0A0A0] border border-[#2A2A2A]",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium", variantStyles[variant], className)}>
      {children}
    </span>
  );
}

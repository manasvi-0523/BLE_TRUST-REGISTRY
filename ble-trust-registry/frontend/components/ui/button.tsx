import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost" | "warning";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-400",
        variant === "warning" && "bg-amber-400 text-slate-950 hover:bg-amber-300",
        variant === "ghost" && "border border-line bg-white/5 text-slate-100 hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}

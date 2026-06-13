import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost" | "warning";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "border-cyan-700 bg-cyan-800 text-white hover:bg-cyan-700 dark:bg-cyan-900 dark:text-cyan-100 dark:hover:bg-cyan-800",
        variant === "danger" && "border-rose-700 bg-rose-600 text-white hover:bg-rose-500",
        variant === "warning" && "border-amber-500 bg-amber-400 text-slate-950 hover:bg-amber-300",
        variant === "ghost" && "border-[var(--border-color)] bg-[var(--bg-card-elevated)] text-[var(--text-primary)] hover:border-cyan-700",
        className
      )}
      {...props}
    />
  );
}

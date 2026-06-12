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
        variant === "primary" && "border-cyan-700 bg-cyan-900 text-cyan-100 hover:bg-cyan-800",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-400",
        variant === "warning" && "bg-amber-400 text-slate-950 hover:bg-amber-300",
        variant === "ghost" && "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800",
        className
      )}
      {...props}
    />
  );
}

import type { ReactNode } from "react";
import type { TrustStatus } from "@/lib/types";

export function TrustBadge({ status }: { status: TrustStatus }) {
  const classes =
    status === "Trusted"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
      : status === "Suspicious"
        ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
        : status === "Potential Trust Deviation"
          ? "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
          : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  return <span className={`inline-flex rounded border px-2 py-1 text-xs ${classes}`}>{status}</span>;
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const color = value >= 90 ? "var(--accent-emerald)" : value >= 70 ? "var(--accent-cyan)" : value >= 50 ? "var(--accent-amber)" : "var(--accent-red)";
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-16 w-16 place-items-center rounded-full text-sm font-bold"
        style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(148, 163, 184, 0.24) 0deg)` }}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-card-elevated)]">{value}</span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <p className="text-sm text-[var(--text-secondary)]">{value >= 80 ? "Stable Environment" : value >= 55 ? "Elevated Risk" : "High Behavioral Risk"}</p>
      </div>
    </div>
  );
}

export function TruncatedCell({ children, title, className = "" }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <td title={title || String(children || "")} className={`overflow-hidden text-ellipsis whitespace-nowrap border-t border-[var(--border-color)] px-2 py-2 ${className}`}>
      {children}
    </td>
  );
}

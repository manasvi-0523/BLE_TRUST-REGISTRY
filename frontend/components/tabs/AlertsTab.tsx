"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import type { LedgerEntry } from "@/lib/types";

export function AlertsTab({ ledger }: { ledger: LedgerEntry[] }) {
  const [riskFilter, setRiskFilter] = useState("All");
  const alerts = useMemo(
    () => ledger.filter((entry) => (entry.riskLevel === "High" || entry.riskLevel === "Critical") && (riskFilter === "All" || entry.riskLevel === riskFilter)),
    [ledger, riskFilter]
  );
  const grouped = Object.values(alerts.reduce<Record<string, { key: string; count: number; first: LedgerEntry; last: LedgerEntry }>>((groups, entry) => {
    const key = `${entry.address}-${entry.riskLevel}`;
    const current = groups[key] || { key, count: 0, first: entry, last: entry };
    groups[key] = { key, count: current.count + 1, first: current.first, last: entry };
    return groups;
  }, {}));

  return (
    <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardTitle>Alert Filters</CardTitle>
        <div className="grid gap-2">
          {["All", "High", "Critical"].map((level) => (
            <button key={level} className={`rounded border border-[var(--border-color)] px-3 py-2 text-left text-sm ${riskFilter === level ? "bg-cyan-500/15" : "bg-[var(--bg-card-elevated)]"}`} onClick={() => setRiskFilter(level)}>
              {level}
            </button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4">
        <Card>
          <CardTitle>Deduplicated Alert Groups</CardTitle>
          <div className="grid gap-2">
            {grouped.map((group) => (
              <div key={group.key} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-elevated)] p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{group.last.deviceName} | {group.last.riskLevel}</span>
                  <span>{group.count} events</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">First {new Date(group.first.timestamp).toLocaleTimeString()} | Last {new Date(group.last.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
            {grouped.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No High or Critical alerts match this filter.</p>}
          </div>
        </Card>
        <Card>
          <CardTitle>Alert History</CardTitle>
          <div className="grid gap-2">
            {alerts.slice().reverse().map((entry) => (
              <div key={entry.currentHash} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-elevated)] p-3 text-sm">
                <p className="font-medium">{entry.riskLevel} | {entry.deviceName}</p>
                <p className="font-mono text-xs text-[var(--text-muted)]">{entry.address}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}


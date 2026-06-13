"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import type { LedgerEntry } from "@/lib/types";

export function BlockchainTab({ ledger, ledgerValid }: { ledger: LedgerEntry[]; ledgerValid: boolean }) {
  const [selectedHash, setSelectedHash] = useState("");
  const selected = ledger.find((entry) => entry.currentHash === selectedHash) || ledger.at(-1) || null;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="surface overflow-hidden rounded-xl">
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <h2 className="text-lg font-semibold">Hash-chain Ledger</h2>
          <p className="text-xs text-[var(--text-secondary)]">Integrity: {ledgerValid ? "Verified" : "Failed"}</p>
        </div>
        <table className="w-full table-fixed text-left text-xs">
          <thead className="text-[var(--text-secondary)]">
            <tr><th className="p-2">Time</th><th>Device</th><th>Address</th><th>Risk</th><th>Score</th><th>Hash</th></tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr key={entry.currentHash} className="border-t border-[var(--border-color)] hover:bg-cyan-500/5" onClick={() => setSelectedHash(entry.currentHash)}>
                <td className="p-2">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                <td className="truncate">{entry.deviceName}</td>
                <td className="truncate font-mono">{entry.address}</td>
                <td>{entry.riskLevel}</td>
                <td>{entry.riskScore}</td>
                <td className="truncate font-mono">{entry.currentHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Card>
        <CardTitle>Block Inspector</CardTitle>
        {selected ? (
          <div className="space-y-2 text-xs">
            {Object.entries(selected).map(([key, value]) => (
              <div key={key} className="rounded border border-[var(--border-color)] bg-[var(--bg-card-elevated)] p-2">
                <p className="text-[var(--text-muted)]">{key}</p>
                <p className="break-all font-mono">{String(value)}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--text-secondary)]">No ledger entries yet.</p>}
      </Card>
    </section>
  );
}


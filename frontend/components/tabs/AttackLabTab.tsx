"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { LedgerEntry } from "@/lib/types";

export function AttackLabTab({ ledger }: { ledger: LedgerEntry[] }) {
  const [address, setAddress] = useState("");
  const entries = useMemo(
    () => ledger
      .filter((entry) => entry.riskLevel === "High" || entry.riskLevel === "Critical")
      .filter((entry) => !address || entry.address.toLowerCase().includes(address.toLowerCase()))
      .slice()
      .reverse(),
    [address, ledger]
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ble-attack-ledger.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardTitle>Attack Replay Filters</CardTitle>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Filter by address"
          className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-card-elevated)] px-3 py-2 text-sm"
        />
        <Button className="mt-3 w-full" onClick={exportJson}><Download size={15} /> Export JSON</Button>
        <p className="mt-4 text-xs text-[var(--text-secondary)]">Signal waveform replay requires raw RSSI timeseries logging. Planned for Phase 4.</p>
      </Card>
      <Card>
        <CardTitle>Visual Attack Timeline</CardTitle>
        <div className="relative grid gap-4 border-l border-[var(--border-color)] pl-5">
          {entries.map((entry) => (
            <div key={entry.currentHash} className="relative rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-elevated)] p-3 text-sm">
              <span className={`absolute -left-[29px] top-4 h-3 w-3 rounded-full ${entry.riskLevel === "Critical" ? "bg-red-500" : "bg-amber-500"}`} />
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{entry.riskLevel} | {entry.deviceName}</p>
                <p className="text-xs text-[var(--text-muted)]">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{entry.address}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span>RSSI {entry.rssi}</span>
                <span>Freq {entry.advertisementFrequency}</span>
                <span>Services {entry.serviceUuidCount}</span>
                <span>Payload {entry.payloadLengthApprox}</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--text-secondary)]">
                {entry.reason.split("; ").filter(Boolean).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No attack ledger entries match this filter.</p>}
        </div>
      </Card>
    </section>
  );
}


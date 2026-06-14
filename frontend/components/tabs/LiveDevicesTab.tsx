"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BLEDeviceScan } from "@/lib/types";
import { TrustBadge, TruncatedCell } from "./shared";
import type { DeviceRow } from "./types";

export function LiveDevicesTab({
  rows,
  selectedAddress,
  onSelect,
  onRegister
}: {
  rows: DeviceRow[];
  selectedAddress: string;
  onSelect: (address: string) => void;
  onRegister: (device: BLEDeviceScan) => void;
}) {
  const [expanded, setExpanded] = useState("");
  const columnWidths = ["14%", "13%", "7%", "5%", "6%", "5%", "6%", "8%", "9%", "7%", "9%", "11%"];

  return (
    <section className="surface overflow-hidden rounded-xl">
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <h1 className="text-lg font-semibold">Live BLE Devices</h1>
        <p className="text-xs text-[var(--text-secondary)]">Fixed layout table. Click a row to expand diagnosis evidence.</p>
      </div>
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <colgroup>{columnWidths.map((width, index) => <col key={`device-column-${index}`} style={{ width }} />)}</colgroup>
        <thead className="bg-[var(--bg-card-elevated)] text-[var(--text-secondary)]">
          <tr>
            {["Display Name", "Address", "Name", "RSSI", "Freq", "Svc", "Est Size", "Source", "Trust", "Risk", "Prediction", "Reason"].map((header) => (
              <th key={header} className="border-b border-[var(--border-color)] px-2 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.address}>
              <tr
                className={selectedAddress === row.address ? "bg-cyan-500/10" : "hover:bg-cyan-500/5"}
                onClick={() => {
                  onSelect(row.address);
                  setExpanded(expanded === row.address ? "" : row.address);
                }}
              >
                <TruncatedCell title={row.displayName} className="font-medium">{row.displayName}</TruncatedCell>
                <TruncatedCell title={row.address} className="font-mono">{row.address}</TruncatedCell>
                <TruncatedCell>{row.nameSource}</TruncatedCell>
                <TruncatedCell>{row.rssi}</TruncatedCell>
                <TruncatedCell>{row.advertisementFrequency.toFixed(1)}</TruncatedCell>
                <TruncatedCell>{row.serviceUuidCount}</TruncatedCell>
                <TruncatedCell>{row.estimatedAdvertisementSize}</TruncatedCell>
                <TruncatedCell>{row.source}</TruncatedCell>
                <TruncatedCell title={`${row.trustStatus} | Trust ${row.trustScore}`}>
                  <TrustBadge status={row.trustStatus} /> <span className="ml-1">{row.trustScore}</span>
                </TruncatedCell>
                <TruncatedCell title={`${row.riskLevel} | ${row.confidence}% confidence`}>
                  {row.riskLevel} {row.score} | {row.confidence}%
                </TruncatedCell>
                <TruncatedCell title={row.prediction}>{row.prediction}</TruncatedCell>
                <TruncatedCell title={row.reasons.join("; ")}>{row.reasons[0] || "No active evidence."}</TruncatedCell>
              </tr>
              {expanded === row.address && (
                <tr key={`${row.address}-details`}>
                  <td colSpan={12} className="border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <div>
                        <p className="font-semibold">{row.displayName}</p>
                        <p className="font-mono text-xs text-[var(--text-secondary)]">{row.address}</p>
                        <p className="mt-2">Trust Score: {row.trustScore}</p>
                        <p>Confidence: {row.confidence}%</p>
                      </div>
                      <div>
                        <p className="font-semibold">Evidence</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
                          {row.reasons.map((reason, index) => <li key={`${row.address}-reason-${index}`}>{reason}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold">Action</p>
                        <p className="text-[var(--text-secondary)]">{row.recommendedAction}</p>
                        {(row.trustStatus === "Observing" || row.trustStatus === "Unregistered") && (
                          <Button className="mt-3" onClick={(event) => {
                            event.stopPropagation();
                            onRegister(row);
                          }}>
                            Register Baseline
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="px-3 py-10 text-center text-[var(--text-muted)]">No BLE events yet. Start monitoring after the backend is connected.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}


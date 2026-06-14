import { CheckCircle2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { ConnectionState, LedgerEntry, MonitoringState, ScannerStatusPayload, TrustedDeviceBaseline } from "@/lib/types";
import type { DeviceRow } from "./types";
import { Gauge } from "./shared";

export function DashboardTab({
  rows,
  monitoringState,
  connection,
  scannerStatus,
  trustedDevices,
  ledger,
  ledgerValid,
  onStart,
  onStop,
  onVerify
}: {
  rows: DeviceRow[];
  monitoringState: MonitoringState;
  connection: ConnectionState;
  scannerStatus: ScannerStatusPayload;
  trustedDevices: TrustedDeviceBaseline[];
  ledger: LedgerEntry[];
  ledgerValid: boolean;
  onStart: () => void;
  onStop: () => void;
  onVerify: () => void;
}) {
  const activeRows = rows.filter((row) => Date.now() - new Date(row.timestamp).getTime() <= 30000);
  const environmentTrust = activeRows.length
    ? Math.round(activeRows.reduce((sum, row) => sum + row.trustScore, 0) / activeRows.length)
    : 100;
  const topAlerts = ledger.filter((entry) => entry.riskLevel === "High" || entry.riskLevel === "Critical").slice(-5).reverse();

  return (
    <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="grid gap-4">
        <Card>
          <CardTitle>Trust Intelligence Summary</CardTitle>
          <Gauge value={environmentTrust} label="Environment Trust Score" />
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Trusted" value={String(rows.filter((row) => row.trustStatus === "Trusted").length)} />
            <Stat label="Suspicious" value={String(rows.filter((row) => row.trustStatus === "Suspicious").length)} />
            <Stat label="Critical" value={String(rows.filter((row) => row.riskLevel === "Critical").length)} />
            <Stat label="Unregistered" value={String(rows.filter((row) => row.trustStatus === "Unregistered").length)} />
          </div>
        </Card>

        <Card>
          <CardTitle>Scanner Controls</CardTitle>
          <div className="grid gap-2">
            <Button onClick={onStart}><Play size={15} /> Start Real-Time Monitoring</Button>
            <Button variant="ghost" onClick={onStop}><Square size={15} /> Stop Monitoring</Button>
            <Button variant="ghost" onClick={onVerify}><CheckCircle2 size={15} /> Verify Ledger Integrity</Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Monitoring" value={monitoringState} />
          <Stat label="Backend" value={connection} detail={`Queue ${scannerStatus.broadcastQueueSize ?? 0}`} />
          <Stat label="Scanner" value={scannerStatus.running ? "Running" : "Stopped"} />
          <Stat label="Devices" value={String(rows.length)} />
          <Stat label="Baselines" value={String(trustedDevices.length)} />
          <Stat label="Ledger" value={ledgerValid ? "Valid" : "Invalid"} />
        </section>

        <Card>
          <CardTitle>Top Alerts</CardTitle>
          <div className="grid gap-2">
            {topAlerts.map((entry) => (
              <div key={entry.currentHash} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-elevated)] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{entry.deviceName}</span>
                  <span className="text-xs text-[var(--text-muted)]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.riskLevel} | {entry.reason || "No reason stored."}</p>
              </div>
            ))}
            {topAlerts.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No High or Critical alerts recorded.</p>}
          </div>
        </Card>
      </div>
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-elevated)] px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 flex min-h-5 items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{value}</p>
        {detail && <p className="shrink-0 text-xs text-[var(--text-muted)]">{detail}</p>}
      </div>
    </div>
  );
}

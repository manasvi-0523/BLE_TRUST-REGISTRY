import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { BLEDeviceScan, RuntimeAnalysis, TrustedDeviceBaseline } from "@/lib/types";
import type { DeviceRow } from "./types";

export function BaselineScannerTab({
  trustedDevices,
  runtime,
  rows,
  trainingAddress,
  trainingProgress,
  onStartTraining,
  onForceSave,
  onRecalibrate
}: {
  trustedDevices: TrustedDeviceBaseline[];
  runtime: RuntimeAnalysis;
  rows: DeviceRow[];
  trainingAddress: string;
  trainingProgress: number;
  onStartTraining: (device: BLEDeviceScan) => void;
  onForceSave: (device: BLEDeviceScan) => void;
  onRecalibrate: (device: BLEDeviceScan, forceDemoOverride?: boolean) => void;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {trustedDevices.map((device) => {
        const live = rows.find((row) => row.address === device.address);
        const history = runtime.histories[device.address];
        return (
          <Card key={device.address}>
            <CardTitle>{device.displayName}</CardTitle>
            <p className="font-mono text-xs text-[var(--text-muted)]">{device.address}</p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Registered {new Date(device.registeredAt).toLocaleString()}</p>
            <Range label="RSSI" min={device.rssiMin} avg={device.averageRssi} max={device.rssiMax} live={live?.rssi} />
            <Range label="Frequency" min={device.frequencyMin} avg={device.averageFrequency} max={device.frequencyMax} live={live?.advertisementFrequency} />
            <Range label="Estimated size" min={device.estimatedAdvertisementSizeMin} max={device.estimatedAdvertisementSizeMax} live={live?.estimatedAdvertisementSize} />
            <p className="mt-3 text-sm">Service UUID count: {device.serviceUuidCount}{live && live.serviceUuidCount !== device.serviceUuidCount ? " | changed live" : ""}</p>
            <Sparkline values={history?.rssi || []} />
            {live && (
              <div className="mt-3 grid gap-2">
                <Button variant="ghost" onClick={() => onStartTraining(live)}>
                  {trainingAddress === live.address ? `Training ${trainingProgress}%` : "Start Training"}
                </Button>
                <Button onClick={() => onRecalibrate(live)}>Recalibrate Baseline</Button>
                <Button variant="warning" onClick={() => onForceSave(live)}>Demo Override Save</Button>
              </div>
            )}
          </Card>
        );
      })}
      {trustedDevices.length === 0 && <Card><CardTitle>No Baselines</CardTitle><p className="text-sm text-[var(--text-secondary)]">Register a live device baseline to inspect profiles here.</p></Card>}
      <Card>
        <CardTitle>Behavioral Baseline Fields</CardTitle>
        <p className="text-sm text-[var(--text-secondary)]">Baselines use RSSI, advertisement frequency, service UUID count, manufacturer data length, and estimated advertisement size.</p>
      </Card>
    </section>
  );
}

function Range({ label, min, avg, max, live }: { label: string; min: number; avg?: number; max: number; live?: number }) {
  return (
    <div className="mt-3 text-xs">
      <div className="flex justify-between"><span>{label}</span><span>{min} / {avg ?? "-"} / {max}</span></div>
      <div className="mt-1 h-2 rounded bg-slate-500/20">
        <div className="h-2 rounded bg-cyan-600" style={{ width: `${live === undefined ? 50 : Math.max(5, Math.min(100, ((live - min) / Math.max(max - min, 1)) * 100))}%` }} />
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const recent = values.slice(-50);
  if (recent.length < 2) return <p className="mt-3 text-xs text-[var(--text-muted)]">No live RSSI sparkline yet.</p>;
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const points = recent.map((value, index) => {
    const x = (index / Math.max(recent.length - 1, 1)) * 160;
    const y = 42 - ((value - min) / Math.max(max - min, 1)) * 36;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="mt-3 h-12 w-full" viewBox="0 0 160 48" preserveAspectRatio="none">
      <polyline fill="none" stroke="var(--accent-cyan)" strokeWidth="2" points={points} />
    </svg>
  );
}



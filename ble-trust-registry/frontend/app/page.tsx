"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Play, Save, Square } from "lucide-react";
import { AlertBanner } from "@/components/AlertBanner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { calculateRiskScore, verifyAuthenticity } from "@/lib/anomalyEngine";
import { getFingerprint } from "@/lib/fingerprintTracker";
import { createLedgerEntry, verifyLedger } from "@/lib/hashChain";
import {
  loadLedgerEntries,
  loadTrustedDevices,
  saveLedgerEntries,
  saveTrustedDevices
} from "@/lib/storage";
import type {
  BLEDeviceScan,
  ConnectionState,
  DeviceHistory,
  LedgerEntry,
  MonitoringState,
  RiskResult,
  RuntimeAnalysis,
  ScannerStatusPayload,
  TrustedDeviceBaseline,
  TrustStatus
} from "@/lib/types";
import { ScanWebSocketClient } from "@/lib/websocket";

const API = process.env.NEXT_PUBLIC_SCANNER_API || "http://127.0.0.1:8000";
const WS = process.env.NEXT_PUBLIC_SCANNER_WS || "ws://127.0.0.1:8000/ws/scan-events";
const MAX_DEBUG_EVENTS = 300;

type DeviceRow = BLEDeviceScan & RiskResult & { observations: number };

export default function DashboardPage() {
  const [connection, setConnection] = useState<ConnectionState>("Disconnected");
  const [monitoringState, setMonitoringState] = useState<MonitoringState>("NOT_MONITORING");
  const [scannerStatus, setScannerStatus] = useState<ScannerStatusPayload>({
    running: false,
    connectedClients: 0,
    adapterStatus: "unknown",
    lastScanTime: null
  });
  const [devices, setDevices] = useState<BLEDeviceScan[]>([]);
  const [debugEvents, setDebugEvents] = useState<BLEDeviceScan[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceBaseline[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [trainingAddress, setTrainingAddress] = useState("");
  const [trainingStartedAt, setTrainingStartedAt] = useState<number | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const bufferRef = useRef<BLEDeviceScan[]>([]);
  const wsRef = useRef<ScanWebSocketClient | null>(null);

  useEffect(() => {
    setTrustedDevices(loadTrustedDevices());
    setLedger(loadLedgerEntries());
  }, []);

  const baselineByAddress = useMemo(
    () => new Map(trustedDevices.map((baseline) => [baseline.address.toLowerCase(), baseline])),
    [trustedDevices]
  );

  const runtime = useMemo(() => buildRuntimeAnalysis(debugEvents), [debugEvents]);

  const rows = useMemo<DeviceRow[]>(() => {
    return devices
      .filter((device) => device.source !== "demo-backup")
      .map((device) => {
        const baseline = baselineByAddress.get(device.address.toLowerCase()) || null;
        const result = calculateRiskScore(device, baseline, trustedDevices, runtime);
        return {
          ...device,
          ...result,
          observations: runtime.histories[device.address]?.timestamps.length || 1
        };
      })
      .sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel) || b.timestamp.localeCompare(a.timestamp));
  }, [baselineByAddress, devices, runtime, trustedDevices]);

  const selected = rows.find((row) => row.address === selectedAddress) || rows[0] || null;
  const activeRows = useMemo(() => {
    const cutoff = Date.now() - 30000;
    return rows.filter((row) => new Date(row.timestamp).getTime() >= cutoff);
  }, [rows]);
  const highestActive = activeRows[0] || null;
  const authenticity = selected
    ? verifyAuthenticity(selected, baselineByAddress.get(selected.address.toLowerCase()) || null)
    : null;

  useEffect(() => {
    const client = new ScanWebSocketClient(WS);
    wsRef.current = client;
    const removeState = client.onState(setConnection);
    const removeEvent = client.onEvent((event) => {
      bufferRef.current.push(normalizeEvent(event));
    });
    client.connect();
    return () => {
      removeState();
      removeEvent();
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (bufferRef.current.length === 0) return;
      const batch = bufferRef.current;
      bufferRef.current = [];
      setDevices((prev) => mergeDevicesByAddress(prev, batch));
      setDebugEvents((prev) => [...prev, ...batch].slice(-MAX_DEBUG_EVENTS));
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`${API}/status`);
        const status = await response.json();
        setScannerStatus(status);
      } catch {
        setConnection("Disconnected");
      }
    }, 2500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!trainingStartedAt) return;
    const interval = window.setInterval(() => {
      setTrainingProgress(Math.min(100, Math.round(((Date.now() - trainingStartedAt) / 60000) * 100)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [trainingStartedAt]);

  useEffect(() => {
    if (!scannerStatus.running) {
      setMonitoringState(connection === "Connected" ? "BACKEND_CONNECTED" : "NOT_MONITORING");
      return;
    }
    if (!highestActive) {
      setMonitoringState("MONITORING_ACTIVE");
      return;
    }
    if (highestActive.riskLevel === "Critical") setMonitoringState("TRUST_VIOLATION_DETECTED");
    else if (highestActive.riskLevel === "High" || highestActive.riskLevel === "Medium") setMonitoringState("SUSPICIOUS_ACTIVITY");
    else setMonitoringState("MONITORING_ACTIVE");
  }, [connection, highestActive, scannerStatus.running]);

  useEffect(() => {
    if (!highestActive || (highestActive.riskLevel !== "High" && highestActive.riskLevel !== "Critical")) return;
    setLedger((current) => {
      if (current.some((entry) => entry.timestamp === highestActive.timestamp && entry.address === highestActive.address)) {
        return current;
      }
      const next = [
        ...current,
        createLedgerEntry(highestActive, highestActive, current.at(-1)?.currentHash || "GENESIS")
      ];
      saveLedgerEntries(next);
      return next;
    });
  }, [highestActive]);

  const startMonitoring = useCallback(async () => {
    await fetch(`${API}/start-monitoring`, { method: "POST" });
    wsRef.current?.connect();
  }, []);

  const stopMonitoring = useCallback(async () => {
    await fetch(`${API}/stop-monitoring`, { method: "POST" });
  }, []);

  const registerBaseline = useCallback((device: BLEDeviceScan) => {
    const samples = debugEvents.filter((event) => event.address === device.address);
    if (samples.length === 0) return;
    const rssi = samples.map((event) => event.rssi);
    const frequency = samples.map((event) => event.advertisementFrequency);
    const payload = samples.map((event) => event.payloadLengthApprox);
    const baseline: TrustedDeviceBaseline = {
      deviceName: device.deviceName,
      displayName: device.displayName,
      address: device.address,
      rssiMin: Math.min(...rssi),
      rssiMax: Math.max(...rssi),
      averageRssi: average(rssi),
      frequencyMin: Math.min(...frequency),
      frequencyMax: Math.max(...frequency),
      averageFrequency: average(frequency),
      serviceUuidCount: device.serviceUuidCount,
      payloadLengthMin: Math.min(...payload),
      payloadLengthMax: Math.max(...payload),
      registeredAt: new Date().toISOString(),
      trustLabel: "Trusted"
    };
    const next = [...trustedDevices.filter((item) => item.address !== device.address), baseline];
    setTrustedDevices(next);
    saveTrustedDevices(next);
    setTrainingAddress("");
    setTrainingStartedAt(null);
    setTrainingProgress(0);
  }, [debugEvents, trustedDevices]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-slate-100">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <AlertBanner assessment={highestActive} device={highestActive} />

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Stat label="Monitoring" value={monitoringState} />
          <Stat label="Backend" value={connection} />
          <Stat label="Scanner" value={scannerStatus.running ? "Running" : "Stopped"} />
          <Stat label="Devices" value={String(rows.length)} />
          <Stat label="Trusted" value={String(trustedDevices.length)} />
          <Stat label="Ledger" value={verifyLedger(ledger) ? "Valid" : "Invalid"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardTitle>Scanner Connection Status</CardTitle>
              <StatusLine label="Backend" value={connection} />
              <StatusLine label="Scanner" value={scannerStatus.running ? "Running" : "Stopped"} />
              <StatusLine label="Adapter" value={scannerStatus.adapterStatus} />
              <StatusLine label="WebSocket clients" value={String(scannerStatus.connectedClients)} />
              <StatusLine label="Last scan" value={scannerStatus.lastScanTime ? new Date(scannerStatus.lastScanTime).toLocaleTimeString() : "None"} />
            </Card>

            <Card>
              <CardTitle>Monitoring Controls</CardTitle>
              <div className="grid gap-2">
                <Button onClick={startMonitoring}><Play size={15} /> Start Real-Time Monitoring</Button>
                <Button variant="ghost" onClick={stopMonitoring}><Square size={15} /> Stop Monitoring</Button>
                <Button
                  variant="ghost"
                  disabled={!selected}
                  onClick={() => {
                    if (!selected) return;
                    setTrainingAddress(selected.address);
                    setTrainingStartedAt(Date.now());
                  }}
                >
                  Train Baseline
                </Button>
                <Button variant="ghost" onClick={() => alert(verifyLedger(ledger) ? "Ledger integrity verified." : "Ledger integrity failed.")}>
                  <CheckCircle2 size={15} /> Verify Ledger Integrity
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-400">Auto-start Monitoring: OFF | Alert Mode: ON | Auto Log: ON</p>
            </Card>
          </div>

          <section className="rounded-xl border border-slate-800 bg-slate-950">
            <div className="border-b border-slate-800 px-4 py-3">
              <h1 className="text-lg font-semibold">Live BLE Device Table</h1>
              <p className="text-xs text-slate-400">Rows are merged by BLE address. Unknown normal devices stay low risk until evidence justifies escalation.</p>
            </div>
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[1160px] border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-slate-950 text-slate-400">
                  <tr>
                    {["Display Name", "Address", "Name Source", "RSSI", "Frequency", "Services", "Payload", "Source", "Trust Status", "Risk", "Prediction", "Reason", "Action"].map((header) => (
                      <th key={header} className="border-b border-slate-800 px-3 py-2 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <DeviceTableRow
                      key={row.address}
                      row={row}
                      selected={selectedAddress === row.address}
                      onSelect={setSelectedAddress}
                      onRegister={registerBaseline}
                    />
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-3 py-10 text-center text-slate-500">
                        No BLE events yet. Start monitoring after the backend is connected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <Card>
            <CardTitle>Selected Device Diagnosis</CardTitle>
            {selected ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold">{selected.displayName}</p>
                  <p className="font-mono text-xs text-slate-400">{selected.address}</p>
                  <p className="text-xs text-slate-400">Name source: {selected.nameSource}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Badge status={selected.trustStatus} />
                  <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-center">{selected.riskLevel} {selected.score}</span>
                </div>
                <p><span className="text-slate-400">Prediction:</span> {selected.prediction}</p>
                <div>
                  <p className="mb-1 text-slate-400">Evidence</p>
                  <ul className="list-disc space-y-1 pl-5 text-slate-300">
                    {selected.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
                <p><span className="text-slate-400">Recommended action:</span> {selected.recommendedAction}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a device row for diagnosis.</p>
            )}
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <Card>
            <CardTitle>Trusted Device Registry</CardTitle>
            <div className="space-y-2 text-sm">
              {trustedDevices.map((device) => (
                <div key={device.address} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <p className="font-medium">{device.displayName}</p>
                  <p className="font-mono text-xs text-slate-500">{device.address}</p>
                  <p className="text-xs text-slate-400">RSSI {device.rssiMin}-{device.rssiMax}, freq {device.frequencyMin}-{device.frequencyMax}</p>
                </div>
              ))}
              {trustedDevices.length === 0 && <p className="text-slate-400">No trusted baselines registered.</p>}
            </div>
          </Card>

          <Card>
            <CardTitle>Baseline Training</CardTitle>
            {trainingAddress ? (
              <div className="space-y-3 text-sm">
                <p className="font-mono text-xs text-slate-400">{trainingAddress}</p>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-cyan-700" style={{ width: `${trainingProgress}%` }} />
                </div>
                <p>Progress: {trainingProgress}%</p>
                <p>Samples collected: {debugEvents.filter((event) => event.address === trainingAddress).length}</p>
                <Button disabled={!selected} onClick={() => selected && registerBaseline(selected)}><Save size={15} /> Save Baseline</Button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a device and train for 60 seconds before saving a trusted baseline.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Authenticity Check</CardTitle>
            {authenticity ? (
              <div className="space-y-2 text-xs">
                <p className="text-sm font-semibold">{authenticity.status}</p>
                <p className="text-slate-400">{authenticity.reason}</p>
                {authenticity.checks.map((check) => (
                  <div key={check.label} className="rounded-md border border-slate-800 bg-slate-950 p-2">
                    <p>{check.label}: {check.result}</p>
                    <p className="text-slate-500">Baseline {check.registered} | Live {check.live}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Authenticity requires a selected device.</p>
            )}
          </Card>

          <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h2 className="mb-3 text-base font-semibold">Hash-chain Ledger</h2>
            <p className="mb-2 text-xs text-slate-400">High/Critical incidents only. Chain: {verifyLedger(ledger) ? "Valid" : "Invalid"}</p>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400">
                  <tr><th className="py-1">Time</th><th>Device</th><th>Risk</th><th>Hash</th></tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.currentHash} className="border-t border-slate-800">
                      <td className="py-2">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                      <td>{entry.deviceName}</td>
                      <td>{entry.riskLevel}</td>
                      <td className="font-mono text-slate-400">{entry.currentHash.slice(0, 10)}...</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No high-risk ledger entries.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

const DeviceTableRow = memo(function DeviceTableRow({
  row,
  selected,
  onSelect,
  onRegister
}: {
  row: DeviceRow;
  selected: boolean;
  onSelect: (address: string) => void;
  onRegister: (device: BLEDeviceScan) => void;
}) {
  return (
    <tr className={selected ? "bg-slate-900" : "hover:bg-slate-900/60"} onClick={() => onSelect(row.address)}>
      <td className="border-t border-slate-900 px-3 py-2 font-medium">{row.displayName}</td>
      <td className="border-t border-slate-900 px-3 py-2 font-mono text-slate-300">{row.address}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.nameSource}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.rssi}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.advertisementFrequency.toFixed(1)}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.serviceUuidCount}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.payloadLengthApprox}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.source}</td>
      <td className="border-t border-slate-900 px-3 py-2"><Badge status={row.trustStatus} /></td>
      <td className="border-t border-slate-900 px-3 py-2">{row.riskLevel} {row.score}</td>
      <td className="border-t border-slate-900 px-3 py-2">{row.prediction}</td>
      <td className="border-t border-slate-900 px-3 py-2 text-slate-300">{row.reasons[0]}</td>
      <td className="border-t border-slate-900 px-3 py-2">
        {(row.trustStatus === "Observing" || row.trustStatus === "Unregistered") && (
          <button className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200" onClick={(event) => {
            event.stopPropagation();
            onRegister(row);
          }}>
            Register Baseline
          </button>
        )}
      </td>
    </tr>
  );
});

function normalizeEvent(event: BLEDeviceScan): BLEDeviceScan {
  return {
    ...event,
    displayName: event.displayName || event.deviceName || `BLE Device (${event.address.slice(-5)})`,
    deviceName: event.deviceName || event.displayName || `BLE Device (${event.address.slice(-5)})`,
    nameSource: event.nameSource || "address_suffix",
    serviceUuids: event.serviceUuids || [],
    timestamp: event.timestamp || new Date().toISOString()
  };
}

function mergeDevicesByAddress(prevDevices: BLEDeviceScan[], incomingBatch: BLEDeviceScan[]) {
  const byAddress = new Map(prevDevices.map((device) => [device.address, device]));
  incomingBatch.forEach((device) => byAddress.set(device.address, device));
  return [...byAddress.values()];
}

function buildRuntimeAnalysis(events: BLEDeviceScan[]): RuntimeAnalysis {
  const histories: Record<string, DeviceHistory> = {};
  const seenAddressesByName: Record<string, string[]> = {};
  const seenNamesByAddress: Record<string, string[]> = {};
  const fingerprintsByAddress: Record<string, Set<string>> = {};

  events.forEach((event) => {
    const history = histories[event.address] || {
      rssi: [],
      frequency: [],
      payloadLength: [],
      serviceUuidCount: [],
      timestamps: []
    };
    history.rssi = [...history.rssi, event.rssi].slice(-50);
    history.frequency = [...history.frequency, event.advertisementFrequency].slice(-50);
    history.payloadLength = [...history.payloadLength, event.payloadLengthApprox].slice(-50);
    history.serviceUuidCount = [...history.serviceUuidCount, event.serviceUuidCount].slice(-50);
    history.timestamps = [...history.timestamps, new Date(event.timestamp).getTime()].slice(-300);
    histories[event.address] = history;

    seenAddressesByName[event.displayName] = [...new Set([...(seenAddressesByName[event.displayName] || []), event.address])];
    seenNamesByAddress[event.address] = [...new Set([...(seenNamesByAddress[event.address] || []), event.displayName])];
    fingerprintsByAddress[event.address] = fingerprintsByAddress[event.address] || new Set();
    fingerprintsByAddress[event.address].add(getFingerprint(event));
  });

  return {
    histories,
    seenAddressesByName,
    seenNamesByAddress,
    fingerprintCounts: Object.fromEntries(Object.entries(fingerprintsByAddress).map(([address, values]) => [address, values.size]))
  };
}

function Badge({ status }: { status: TrustStatus }) {
  const classes =
    status === "Trusted"
      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
      : status === "Suspicious"
        ? "bg-amber-950 text-amber-300 border-amber-800"
        : status === "Trust Violated"
          ? "bg-red-950 text-red-300 border-red-800"
          : "bg-slate-800 text-slate-300 border-slate-700";
  return <span className={`inline-flex rounded border px-2 py-1 text-xs ${classes}`}>{status}</span>;
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-800 py-2 text-sm last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function average(values: number[]) {
  return Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(2));
}

function riskRank(level: string) {
  return { Critical: 4, High: 3, Medium: 2, Low: 1 }[level as "Critical" | "High" | "Medium" | "Low"] || 0;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CheckCircle2, Play, Radar, ShieldAlert, Square, Trash2 } from "lucide-react";
import { AlertBanner } from "@/components/AlertBanner";
import { ThreatRadar } from "@/components/ThreatRadar";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { calculateRiskScore, verifyAuthenticity } from "@/lib/anomalyEngine";
import { createDemoBaseline, createDemoEvents } from "@/lib/demoData";
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
  LedgerEntry,
  MonitoringState,
  RiskAssessment,
  ScannerStatusPayload,
  TrustedDeviceBaseline
} from "@/lib/types";
import { ScanWebSocketClient } from "@/lib/websocket";

const API = process.env.NEXT_PUBLIC_SCANNER_API || "http://127.0.0.1:8000";
const WS = process.env.NEXT_PUBLIC_SCANNER_WS || "ws://127.0.0.1:8000/ws/scan-events";
const MAX_EVENTS = 300;

type DeviceRow = BLEDeviceScan & RiskAssessment;

export default function DashboardPage() {
  const [connection, setConnection] = useState<ConnectionState>("Disconnected");
  const [monitoringState, setMonitoringState] = useState<MonitoringState>("NOT_MONITORING");
  const [scannerStatus, setScannerStatus] = useState<ScannerStatusPayload>({
    running: false,
    connectedClients: 0,
    adapterStatus: "unknown",
    lastScanTime: null
  });
  const [events, setEvents] = useState<BLEDeviceScan[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceBaseline[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [training, setTraining] = useState<{ address: string; startedAt: number; progress: number } | null>(null);
  const [storageWarning, setStorageWarning] = useState("");
  const [alertMode, setAlertMode] = useState(true);
  const [autoLog, setAutoLog] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [autoStart] = useState(false);
  const wsRef = useRef<ScanWebSocketClient | null>(null);

  useEffect(() => {
    setTrustedDevices(loadTrustedDevices());
    setLedger(loadLedgerEntries());
    const onWarning = (event: Event) => setStorageWarning(`Corrupted localStorage reset for ${(event as CustomEvent).detail}`);
    window.addEventListener("ble-storage-warning", onWarning);
    return () => window.removeEventListener("ble-storage-warning", onWarning);
  }, []);

  useEffect(() => {
    const client = new ScanWebSocketClient(WS);
    wsRef.current = client;
    const removeState = client.onState((state) => {
      setConnection(state);
      if (state === "Connected" && monitoringState === "NOT_MONITORING") {
        setMonitoringState("BACKEND_CONNECTED");
      }
      if (state === "Disconnected" && monitoringState !== "NOT_MONITORING") {
        setMonitoringState("BACKEND_DISCONNECTED");
      }
    });
    const removeEvent = client.onEvent((event) => ingestEvent(event));
    client.connect();
    return () => {
      removeState();
      removeEvent();
      client.disconnect();
    };
  }, []);

  const baselineByAddress = useMemo(
    () => new Map(trustedDevices.map((device) => [device.address.toLowerCase(), device])),
    [trustedDevices]
  );

  const recentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const cutoff = Date.now() - 15000;
    events.forEach((event) => {
      if (new Date(event.timestamp).getTime() >= cutoff) {
        counts[event.address] = (counts[event.address] || 0) + 1;
      }
    });
    return counts;
  }, [events]);

  const deviceRows = useMemo<DeviceRow[]>(() => {
    const latest = new Map<string, BLEDeviceScan>();
    events.forEach((event) => latest.set(event.address, event));
    return [...latest.values()].map((device) => ({
      ...device,
      ...calculateRiskScore(device, baselineByAddress.get(device.address.toLowerCase()) || null, trustedDevices, recentCounts)
    }));
  }, [baselineByAddress, events, recentCounts, trustedDevices]);

  const selectedDevice = deviceRows.find((device) => device.address === selectedAddress) || deviceRows[0] || null;
  const latestRisk = deviceRows.reduce<DeviceRow | null>((max, row) => (!max || row.score > max.score ? row : max), null);
  const authenticity = selectedDevice
    ? verifyAuthenticity(selectedDevice, baselineByAddress.get(selectedDevice.address.toLowerCase()) || null)
    : null;

  const ingestEvent = useCallback(
    (event: BLEDeviceScan) => {
      setEvents((current) => [...current, event].slice(-MAX_EVENTS));
      const baseline = trustedDevices.find((item) => item.address.toLowerCase() === event.address.toLowerCase()) || null;
      const assessment = calculateRiskScore(event, baseline, trustedDevices, recentCounts);
      if (assessment.riskLevel === "High" || assessment.riskLevel === "Critical") {
        setMonitoringState(assessment.riskLevel === "Critical" ? "TRUST_VIOLATION_DETECTED" : "SUSPICIOUS_ACTIVITY");
        if (autoLog) {
          setLedger((current) => {
            const previousHash = current.at(-1)?.currentHash || "GENESIS";
            const next = [...current, createLedgerEntry(event, assessment, previousHash)];
            saveLedgerEntries(next);
            return next;
          });
        }
      }
    },
    [autoLog, recentCounts, trustedDevices]
  );

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${API}/status`);
        const status = await response.json();
        setScannerStatus(status);
      } catch {
        setConnection("Disconnected");
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!training) return;
    const timer = window.setInterval(() => {
      setTraining((current) => {
        if (!current) return null;
        const progress = Math.min(100, Math.round(((Date.now() - current.startedAt) / 60000) * 100));
        return { ...current, progress };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [training]);

  async function startMonitoring() {
    await fetch(`${API}/start-monitoring`, { method: "POST" });
    wsRef.current?.connect();
    setMonitoringState("MONITORING_ACTIVE");
  }

  async function stopMonitoring() {
    await fetch(`${API}/stop-monitoring`, { method: "POST" });
    setMonitoringState(connection === "Connected" ? "BACKEND_CONNECTED" : "NOT_MONITORING");
  }

  function saveBaselineFromSamples(address: string) {
    const samples = events.filter((event) => event.address === address);
    if (!samples.length) return;
    const rssi = samples.map((sample) => sample.rssi);
    const frequency = samples.map((sample) => sample.advertisementFrequency);
    const payload = samples.map((sample) => sample.payloadLengthApprox);
    const latest = samples.at(-1)!;
    const baseline: TrustedDeviceBaseline = {
      deviceName: latest.deviceName,
      address: latest.address,
      rssiMin: Math.min(...rssi),
      rssiMax: Math.max(...rssi),
      averageRssi: average(rssi),
      frequencyMin: Math.min(...frequency),
      frequencyMax: Math.max(...frequency),
      averageFrequency: average(frequency),
      serviceUuidCount: latest.serviceUuidCount,
      payloadLengthMin: Math.min(...payload),
      payloadLengthMax: Math.max(...payload),
      registeredAt: new Date().toISOString(),
      trustLabel: "Trusted"
    };
    const next = [...trustedDevices.filter((device) => device.address !== address), baseline];
    setTrustedDevices(next);
    saveTrustedDevices(next);
    setTraining(null);
  }

  function runDemoBackup() {
    const demoBaseline = createDemoBaseline();
    setDemoMode(true);
    setTrustedDevices((current) => {
      const withoutDuplicate = current.filter((device) => device.address !== demoBaseline.address);
      return [...withoutDuplicate, demoBaseline];
    });
    createDemoEvents().forEach((event, index) => {
      window.setTimeout(() => ingestEvent(event), index * 650);
    });
  }

  function resetDemo() {
    setEvents((current) => current.filter((event) => event.source !== "demo-backup"));
    setLedger((current) => {
      const next = current.filter((entry) => !entry.address.startsWith("FA:KE"));
      saveLedgerEntries(next);
      return next;
    });
    setDemoMode(false);
  }

  const chartData = events.slice(-60).map((event, index) => ({
    index,
    risk: calculateRiskScore(event, baselineByAddress.get(event.address.toLowerCase()) || null, trustedDevices).score,
    rssi: event.rssi,
    frequency: event.advertisementFrequency,
    address: event.address.slice(-5)
  }));

  const distribution = ["Trusted", "Unknown", "Suspicious", "Trust Violated"].map((status) => ({
    name: status,
    value: deviceRows.filter((row) => row.trustStatus === status).length
  }));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5">
      <AlertBanner assessment={latestRisk} device={latestRisk} />

      {storageWarning && <div className="rounded-md border border-amber-300/30 bg-amber-400/10 p-3 text-sm">{storageWarning}</div>}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">BLE Trust Registry</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Real-Time Trust Violation Detection</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Defensive BLE monitoring with trusted baselines, deterministic anomaly scoring, immediate alerts, and a local tamper-evident ledger.
          </p>
        </Card>
        <Card>
          <CardTitle>Scanner Connection Status</CardTitle>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
            <Metric label="Backend" value={connection} />
            <Metric label="Scanner" value={scannerStatus.running ? "Running" : "Stopped"} />
            <Metric label="Adapter" value={scannerStatus.adapterStatus} />
            <Metric label="WS Clients" value={String(scannerStatus.connectedClients)} />
          </div>
          {connection !== "Connected" && (
            <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 p-2 text-sm text-amber-100">
              Scanner backend is not connected. Start the Python FastAPI backend before real-time monitoring.
            </p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Total devices scanned" value={String(events.length)} />
        <MetricCard label="Trusted devices" value={String(trustedDevices.length)} />
        <MetricCard label="Unknown devices" value={String(deviceRows.filter((row) => row.trustStatus === "Unknown").length)} />
        <MetricCard label="Latest risk score" value={String(latestRisk?.score || 0)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardTitle>Monitoring Control Panel</CardTitle>
          <div className="grid gap-2">
            <Button onClick={startMonitoring}>
              <Play size={16} /> Start Real-Time Monitoring
            </Button>
            <Button variant="ghost" onClick={stopMonitoring}>
              <Square size={16} /> Stop Monitoring
            </Button>
            <Button
              variant="ghost"
              disabled={!selectedDevice}
              onClick={() => selectedDevice && setTraining({ address: selectedDevice.address, startedAt: Date.now(), progress: 0 })}
            >
              <Radar size={16} /> Train Baseline
            </Button>
            <Button variant="warning" onClick={runDemoBackup}>Demo Attack Simulation</Button>
            <Button variant="ghost" onClick={resetDemo}>
              <Trash2 size={16} /> Reset Demo
            </Button>
            <Button variant="ghost" onClick={() => alert(verifyLedger(ledger) ? "Ledger integrity verified." : "Ledger integrity failed.")}>
              <CheckCircle2 size={16} /> Verify Ledger Integrity
            </Button>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <Toggle label="Auto-start Monitoring" checked={autoStart} />
            <Toggle label="Alert Mode" checked={alertMode} onChange={setAlertMode} />
            <Toggle label="Auto Log" checked={autoLog} onChange={setAutoLog} />
            <Toggle label="Demo Backup Mode" checked={demoMode} onChange={setDemoMode} />
            <p>Current monitoring state: <span className="font-semibold text-cyan-200">{monitoringState}</span></p>
          </div>
        </Card>

        <Card>
          <CardTitle>Live BLE Monitor</CardTitle>
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  {["Device Name", "Address", "RSSI", "Frequency", "Services", "Mfg Length", "Payload", "Source", "Trust", "Risk", "Prediction", "Reason"].map((head) => (
                    <th key={head} className="border-b border-line p-2">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {deviceRows.map((row) => (
                    <motion.tr
                      key={row.address}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={selectedAddress === row.address ? "bg-cyan-300/8" : ""}
                      onClick={() => setSelectedAddress(row.address)}
                    >
                      <td className="p-2">{row.deviceName}</td>
                      <td className="p-2 font-mono text-xs">{row.address}</td>
                      <td className="p-2">{row.rssi}</td>
                      <td className="p-2">{row.advertisementFrequency.toFixed(1)}</td>
                      <td className="p-2">{row.serviceUuidCount}</td>
                      <td className="p-2">{row.manufacturerDataLength}</td>
                      <td className="p-2">{row.payloadLengthApprox}</td>
                      <td className="p-2">{row.source}</td>
                      <td className="p-2">{row.trustStatus}</td>
                      <td className="p-2">{row.riskLevel}</td>
                      <td className="p-2">{row.prediction}</td>
                      <td className="p-2 text-slate-300">{row.reasons[0]}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Trusted Device Registry</CardTitle>
          <div className="space-y-2">
            {trustedDevices.map((device) => (
              <div key={device.address} className="rounded-md border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong>{device.deviceName}</strong>
                  <button className="text-rose-300" onClick={() => {
                    const next = trustedDevices.filter((item) => item.address !== device.address);
                    setTrustedDevices(next);
                    saveTrustedDevices(next);
                  }}>Delete</button>
                </div>
                <p className="font-mono text-xs text-slate-400">{device.address}</p>
                <p className="text-slate-300">RSSI {device.rssiMin}-{device.rssiMax}, freq {device.frequencyMin}-{device.frequencyMax}, services {device.serviceUuidCount}</p>
              </div>
            ))}
            {!trustedDevices.length && <p className="text-sm text-slate-400">No trusted baselines saved yet.</p>}
          </div>
        </Card>

        <Card>
          <CardTitle>Baseline Training</CardTitle>
          {training && selectedDevice ? (
            <div className="space-y-2 text-sm">
              <p>Training {selectedDevice.deviceName} for 60 seconds.</p>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-cyan-300" style={{ width: `${training.progress}%` }} />
              </div>
              <p>Progress: {training.progress}%</p>
              <p>Samples collected: {events.filter((event) => event.address === training.address).length}</p>
              <Button onClick={() => saveBaselineFromSamples(training.address)}>Review and Save Trusted Baseline</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a live device and click Train Baseline after monitoring starts.</p>
          )}
        </Card>

        <Card>
          <CardTitle>Authenticity Check</CardTitle>
          {authenticity ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{authenticity.status}</p>
              <p className="text-slate-300">{authenticity.reason}</p>
              {authenticity.checks.map((check) => (
                <div key={check.label} className="rounded-md border border-line p-2">
                  <p>{check.label}: {check.result}</p>
                  <p className="text-slate-400">Registered: {check.registered} | Live: {check.live}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No live device selected.</p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardTitle>AI-Assisted Anomaly Detection</CardTitle>
          {selectedDevice ? (
            <div className="space-y-2 text-sm">
              <p>Risk Score: <strong>{selectedDevice.score}</strong></p>
              <p>Risk Level: <strong>{selectedDevice.riskLevel}</strong></p>
              <p>Prediction: <strong>{selectedDevice.prediction}</strong></p>
              <ul className="list-disc space-y-1 pl-5 text-slate-300">
                {selectedDevice.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No anomaly score yet.</p>
          )}
        </Card>

        <Card>
          <CardTitle>Hash-chain Security Ledger</CardTitle>
          <p className="mb-2 text-sm text-slate-300">Chain status: {verifyLedger(ledger) ? "Valid" : "Invalid"}</p>
          <div className="max-h-60 overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="uppercase text-slate-400">
                <tr><th className="p-2">Time</th><th>Device</th><th>Risk</th><th>Reason</th><th>Hash Preview</th></tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <motion.tr key={entry.currentHash} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td className="p-2">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                    <td>{entry.deviceName}</td>
                    <td>{entry.riskLevel} {entry.riskScore}</td>
                    <td>{entry.reason}</td>
                    <td className="font-mono">{entry.currentHash.slice(0, 18)}...</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Risk Charts</CardTitle>
          <div className="grid h-72 gap-4 lg:grid-cols-2">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip />
                <Line dataKey="risk" stroke="#22d3ee" dot={false} />
                <Line dataKey="frequency" stroke="#f59e0b" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip />
                <Area dataKey="rssi" stroke="#34d399" fill="#34d39933" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid h-52 gap-4 lg:grid-cols-2">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="address" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="frequency" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={38} outerRadius={70}>
                  {distribution.map((_, index) => <Cell key={index} fill={["#22c55e", "#64748b", "#f59e0b", "#ef4444"][index]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Threat Radar / Security Pulse Visual</CardTitle>
          <ThreatRadar active={monitoringState === "MONITORING_ACTIVE" || monitoringState === "TRUST_VIOLATION_DETECTED"} />
          <p className="mt-3 text-sm text-slate-300">Live scanning pulse animation stays lightweight and does not delay alert rendering.</p>
        </Card>
      </section>

      <Card>
        <CardTitle>Demo Backup Mode</CardTitle>
        <p className="text-sm text-slate-300">
          Use only when BLE adapter, driver, or scanner backend is unavailable during presentation. Demo mode pre-seeds an in-memory trusted baseline for AirPods 280 ANC, injects normal/suspicious/critical demo records, and Reset Demo clears only demo injected entries.
        </p>
      </Card>
    </main>
  );
}

function average(values: number[]) {
  return Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(2));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/5 p-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <motion.p key={value} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="mt-2 text-3xl font-bold">
        {value}
      </motion.p>
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>{label}: {checked ? "ON" : "OFF"}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={!onChange}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );
}

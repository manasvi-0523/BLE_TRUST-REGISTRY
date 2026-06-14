"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { AlertBanner } from "@/components/AlertBanner";
import { AlertsTab } from "@/components/tabs/AlertsTab";
import { AnomalyLabTab } from "@/components/tabs/AnomalyLabTab";
import { BaselineScannerTab } from "@/components/tabs/BaselineScannerTab";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { LedgerTab } from "@/components/tabs/LedgerTab";
import { LiveDevicesTab } from "@/components/tabs/LiveDevicesTab";
import type { DeviceRow } from "@/components/tabs/types";
import { calculateRiskScore } from "@/lib/anomalyEngine";
import { getZScore } from "@/lib/behaviorProfile";
import { getFingerprint } from "@/lib/fingerprintTracker";
import { createLedgerEntry, verifyLedger } from "@/lib/hashChain";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { scoreInterArrivalIrregularity, scoreRssiTrend, scoreTemporalBurst } from "@/lib/temporalAnalyzer";
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
  RuntimeAnalysis,
  ScannerStatusPayload,
  TrustedDeviceBaseline
} from "@/lib/types";
import { ScanWebSocketClient } from "@/lib/websocket";

const API = process.env.NEXT_PUBLIC_SCANNER_API || "http://127.0.0.1:8000";
const WS = process.env.NEXT_PUBLIC_SCANNER_WS || "ws://127.0.0.1:8000/ws/scan-events";
const MAX_DEBUG_EVENTS = 300;

type IncomingScanEvent = Omit<Partial<BLEDeviceScan>, "source"> & {
  name?: string | null;
  localName?: string | null;
  source?: BLEDeviceScan["source"];
};
type TabId = "dashboard" | "devices" | "ledger" | "alerts" | "anomaly-lab" | "baselines";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "devices", label: "Live Devices" },
  { id: "ledger", label: "Ledger" },
  { id: "alerts", label: "Alerts" },
  { id: "anomaly-lab", label: "Anomaly Lab" },
  { id: "baselines", label: "Baseline Scanner" }
];

export default function DashboardPage() {
  const [connection, setConnection] = useState<ConnectionState>("Disconnected");
  const [monitoringState, setMonitoringState] = useState<MonitoringState>("NOT_MONITORING");
  const [scannerStatus, setScannerStatus] = useState<ScannerStatusPayload>({
    running: false,
    connectedClients: 0,
    adapterStatus: "unknown",
    lastScanTime: null,
    broadcastQueueSize: 0
  });
  const [devices, setDevices] = useState<BLEDeviceScan[]>([]);
  const [debugEvents, setDebugEvents] = useState<BLEDeviceScan[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceBaseline[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [trainingAddress, setTrainingAddress] = useState("");
  const [trainingStartedAt, setTrainingStartedAt] = useState<number | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [theme, setThemeState] = useState<Theme>("dark");
  const bufferRef = useRef<BLEDeviceScan[]>([]);
  const wsRef = useRef<ScanWebSocketClient | null>(null);
  const lastAlertedRef = useRef<Record<string, { level: string; time: number }>>({});

  useEffect(() => {
    setTrustedDevices(loadTrustedDevices());
    setLedger(loadLedgerEntries());
    setThemeState(getTheme());
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

  const activeRows = useMemo(() => {
    const cutoff = Date.now() - 30000;
    return rows.filter((row) => new Date(row.timestamp).getTime() >= cutoff);
  }, [rows]);
  const highestActive = activeRows[0] || null;
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
    if (highestActive.riskLevel === "Critical") setMonitoringState("POTENTIAL_TRUST_DEVIATION");
    else if (highestActive.riskLevel === "High" || highestActive.riskLevel === "Medium") setMonitoringState("SUSPICIOUS_ACTIVITY");
    else setMonitoringState("MONITORING_ACTIVE");
  }, [connection, highestActive, scannerStatus.running]);

  useEffect(() => {
    if (!highestActive || (highestActive.riskLevel !== "High" && highestActive.riskLevel !== "Critical")) return;
    setLedger((current) => {
      const lastAlert = lastAlertedRef.current[highestActive.address];
      if (lastAlert && lastAlert.level === highestActive.riskLevel && Date.now() - lastAlert.time < 60000) {
        return current;
      }
      if (current.some((entry) => entry.timestamp === highestActive.timestamp && entry.address === highestActive.address)) {
        return current;
      }
      const next = [
        ...current,
        createLedgerEntry(highestActive, highestActive, current.at(-1)?.currentHash || "GENESIS")
      ];
      lastAlertedRef.current[highestActive.address] = { level: highestActive.riskLevel, time: Date.now() };
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

  const registerBaseline = useCallback((device: BLEDeviceScan, forceDemoOverride = false) => {
    const currentRisk = rows.find((row) => row.address === device.address);
    if (currentRisk && currentRisk.score > 20) {
      window.alert("Cannot save baseline while device risk score is elevated. Wait for risk to stabilize below 20.");
      return;
    }
    const samples = debugEvents.filter((event) => event.address === device.address);
    if (samples.length < 30) {
      window.alert("Baseline requires at least 30 samples before saving.");
      return;
    }
    const trainingStart = trainingStartedAt || Math.min(...samples.map((event) => new Date(event.timestamp).getTime()));
    const trainingDuration = Date.now() - trainingStart;
    if (trainingDuration < 60000 && !forceDemoOverride) {
      const confirmed = window.confirm("Baseline training has not reached 60 seconds. Save anyway as a demo override?");
      if (!confirmed) return;
    }
    const highRiskDuringTraining = ledger.some(
      (entry) =>
        entry.address === device.address &&
        new Date(entry.timestamp).getTime() >= trainingStart &&
        (entry.riskLevel === "High" || entry.riskLevel === "Critical")
    );
    if (highRiskDuringTraining) {
      window.alert("Cannot save baseline because this device had a High or Critical event during training.");
      return;
    }
    const rssi = samples.map((event) => event.rssi);
    const frequency = samples.map((event) => event.advertisementFrequency);
    const estimatedSizes = samples.map((event) => event.estimatedAdvertisementSize);
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
      estimatedAdvertisementSizeMin: Math.min(...estimatedSizes),
      estimatedAdvertisementSizeMax: Math.max(...estimatedSizes),
      registeredAt: new Date().toISOString(),
      trustLabel: "Trusted"
    };
    const next = [...trustedDevices.filter((item) => item.address !== device.address), baseline];
    setTrustedDevices(next);
    saveTrustedDevices(next);
    setTrainingAddress("");
    setTrainingStartedAt(null);
    setTrainingProgress(0);
  }, [debugEvents, ledger, rows, trainingStartedAt, trustedDevices]);

  const ledgerValid = verifyLedger(ledger);
  const changeTheme = () => setThemeState(toggleTheme());

  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-4 py-4 text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <AlertBanner assessment={highestActive} device={highestActive} />

        <div className="surface flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-cyan-600 bg-cyan-500/15 text-[var(--text-primary)]"
                    : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-cyan-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            onClick={changeTheme}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-elevated)] px-3 py-2 text-sm font-semibold"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        {trainingAddress && (
          <section className="surface rounded-xl p-4 text-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">Baseline training active</p>
                <p className="font-mono text-xs text-[var(--text-secondary)]">{trainingAddress}</p>
              </div>
              <p>{trainingProgress}% | {debugEvents.filter((event) => event.address === trainingAddress).length} samples</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-500/20">
              <div className="h-2 rounded-full bg-cyan-700" style={{ width: `${trainingProgress}%` }} />
            </div>
          </section>
        )}

        <section key={activeTab}>
            {activeTab === "dashboard" && (
              <DashboardTab
                rows={rows}
                monitoringState={monitoringState}
                connection={connection}
                scannerStatus={scannerStatus}
                trustedDevices={trustedDevices}
                ledger={ledger}
                ledgerValid={ledgerValid}
                onStart={startMonitoring}
                onStop={stopMonitoring}
                onVerify={() => alert(ledgerValid ? "Ledger integrity verified." : "Ledger integrity failed.")}
              />
            )}
            {activeTab === "devices" && (
              <LiveDevicesTab
                rows={rows}
                selectedAddress={selectedAddress}
                onSelect={setSelectedAddress}
                onRegister={registerBaseline}
              />
            )}
            {activeTab === "ledger" && <LedgerTab ledger={ledger} ledgerValid={ledgerValid} />}
            {activeTab === "alerts" && <AlertsTab ledger={ledger} />}
            {activeTab === "anomaly-lab" && <AnomalyLabTab ledger={ledger} />}
            {activeTab === "baselines" && (
              <BaselineScannerTab
                trustedDevices={trustedDevices}
                runtime={runtime}
                rows={rows}
                trainingAddress={trainingAddress}
                trainingProgress={trainingProgress}
                onStartTraining={(device) => {
                  setTrainingAddress(device.address);
                  setTrainingStartedAt(Date.now());
                }}
                onForceSave={(device) => registerBaseline(device, true)}
                onRecalibrate={registerBaseline}
              />
            )}
        </section>
      </div>
    </main>
  );
}

function normalizeEvent(event: IncomingScanEvent): BLEDeviceScan {
  const address = String(event.address || "unknown-address").trim() || "unknown-address";
  const fallbackName = `BLE Device (${address.slice(-5)})`;
  const displayName = String(event.displayName || event.deviceName || event.name || event.localName || fallbackName).trim();
  const deviceName = String(event.deviceName || event.displayName || event.name || event.localName || displayName || fallbackName).trim();
  return {
    rawName: event.rawName ?? null,
    displayName: displayName || fallbackName,
    manufacturerName: event.manufacturerName ?? null,
    deviceTypeGuess: event.deviceTypeGuess ?? null,
    deviceName: deviceName || fallbackName,
    address,
    rssi: Number(event.rssi ?? -100),
    advertisementFrequency: Number(event.advertisementFrequency ?? 0),
    manufacturerDataLength: Number(event.manufacturerDataLength ?? 0),
    estimatedAdvertisementSize: Number(event.estimatedAdvertisementSize ?? 0),
    firstSeenAt: event.firstSeenAt ?? null,
    lastSeenAt: event.lastSeenAt ?? null,
    serviceUuidCount: Number(event.serviceUuidCount ?? event.serviceUuids?.length ?? 0),
    nameSource: event.nameSource || "address_suffix",
    serviceUuids: event.serviceUuids || [],
    source: event.source || "realtime-scanner",
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
  const latestTimestampByAddress: Record<string, number> = {};
  const latestFingerprintByAddress: Record<string, string> = {};

  events.forEach((event) => {
    const history = histories[event.address] || {
      rssi: [],
      frequency: [],
      estimatedAdvertisementSizes: [],
      serviceUuidCount: [],
      timestamps: [],
      anomalyFlags: []
    };
    history.rssi = [...history.rssi, event.rssi].slice(-50);
    history.frequency = [...history.frequency, event.advertisementFrequency].slice(-50);
    history.estimatedAdvertisementSizes = [...history.estimatedAdvertisementSizes, event.estimatedAdvertisementSize].slice(-50);
    history.serviceUuidCount = [...history.serviceUuidCount, event.serviceUuidCount].slice(-50);
    history.timestamps = [...history.timestamps, new Date(event.timestamp).getTime()].slice(-300);
    history.anomalyFlags = [...history.anomalyFlags, isBehavioralEventAnomalous(event, history)].slice(-300);
    histories[event.address] = history;
    latestTimestampByAddress[event.address] = new Date(event.timestamp).getTime();
    latestFingerprintByAddress[event.address] = getFingerprint(event);

    seenAddressesByName[event.displayName] = [...new Set([...(seenAddressesByName[event.displayName] || []), event.address])];
    seenNamesByAddress[event.address] = [...new Set([...(seenNamesByAddress[event.address] || []), event.displayName])];
    fingerprintsByAddress[event.address] = fingerprintsByAddress[event.address] || new Set();
    fingerprintsByAddress[event.address].add(getFingerprint(event));
  });
  const consecutiveAnomalyCount: Record<string, number> = {};
  Object.entries(histories).forEach(([address, history]) => {
    consecutiveAnomalyCount[address] = getTrailingTrueCount(history.anomalyFlags);
  });

  const activeCutoff = Date.now() - 30000;
  const addressesByFingerprint: Record<string, string[]> = {};
  Object.entries(latestFingerprintByAddress).forEach(([address, fingerprint]) => {
    if ((latestTimestampByAddress[address] || 0) < activeCutoff) return;
    const latestEvent = events.findLast((event) => event.address === address);
    if (!latestEvent || !isMeaningfulFingerprint(latestEvent)) return;
    addressesByFingerprint[fingerprint] = [...(addressesByFingerprint[fingerprint] || []), address];
  });
  const simultaneousDuplicateFingerprints = [
    ...new Set(
      Object.values(addressesByFingerprint)
        .filter((addresses) => addresses.length > 1)
        .flat()
    )
  ];

  return {
    histories,
    seenAddressesByName,
    seenNamesByAddress,
    fingerprintCounts: Object.fromEntries(Object.entries(fingerprintsByAddress).map(([address, values]) => [address, values.size])),
    consecutiveAnomalyCount,
    simultaneousDuplicateFingerprints
  };
}

function isBehavioralEventAnomalous(event: BLEDeviceScan, history: DeviceHistory) {
  const burst = scoreTemporalBurst(history.timestamps);
  const timing = scoreInterArrivalIrregularity(history.timestamps);
  const trend = scoreRssiTrend(history.rssi);
  const frequencyZ = getZScore(history.frequency, event.advertisementFrequency);
  const rssiZ = getZScore(history.rssi, event.rssi);
  return (
    burst.score > 0 ||
    timing.score > 0 ||
    trend.score > 0 ||
    frequencyZ > 2.0 ||
    rssiZ > 3.5 ||
    event.advertisementFrequency > 50 ||
    event.estimatedAdvertisementSize > 200
  );
}

function getTrailingTrueCount(flags: boolean[]) {
  let count = 0;
  for (let index = flags.length - 1; index >= 0; index--) {
    if (!flags[index]) break;
    count += 1;
  }
  return count;
}

function isMeaningfulFingerprint(device: BLEDeviceScan) {
  const strongSignals = [
    device.serviceUuids.length > 0 || device.serviceUuidCount > 0,
    device.manufacturerDataLength > 0,
    device.estimatedAdvertisementSize > 0,
    Boolean(device.deviceTypeGuess),
    Boolean(device.displayName && !device.displayName.startsWith("BLE Device ("))
  ];
  return strongSignals.filter(Boolean).length >= 2;
}

function average(values: number[]) {
  return Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(2));
}

function riskRank(level: string) {
  return { Critical: 4, High: 3, Medium: 2, Low: 1 }[level as "Critical" | "High" | "Medium" | "Low"] || 0;
}

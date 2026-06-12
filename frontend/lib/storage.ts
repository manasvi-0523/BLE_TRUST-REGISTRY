import type { LedgerEntry, TrustedDeviceBaseline } from "./types";

export const STORAGE_KEYS = {
  trustedDevices: "ble_trusted_devices",
  baselines: "ble_baselines",
  ledgerEntries: "ble_ledger_entries"
} as const;

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.setItem(key, "[]");
    window.dispatchEvent(new CustomEvent("ble-storage-warning", { detail: key }));
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadTrustedDevices() {
  return readArray<TrustedDeviceBaseline>(STORAGE_KEYS.trustedDevices);
}

export function saveTrustedDevices(devices: TrustedDeviceBaseline[]) {
  writeArray(STORAGE_KEYS.trustedDevices, devices);
  writeArray(STORAGE_KEYS.baselines, devices);
}

export function loadLedgerEntries() {
  return readArray<LedgerEntry>(STORAGE_KEYS.ledgerEntries);
}

export function saveLedgerEntries(entries: LedgerEntry[]) {
  writeArray(STORAGE_KEYS.ledgerEntries, entries);
}

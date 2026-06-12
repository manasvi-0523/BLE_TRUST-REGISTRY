import type { BLEDeviceScan } from "./types";

export function getFingerprint(device: BLEDeviceScan) {
  return [
    device.serviceUuidCount,
    Math.round(device.manufacturerDataLength / 4) * 4,
    Math.round(device.payloadLengthApprox / 4) * 4,
    device.nameSource ?? "unknown"
  ].join("|");
}

export function scoreFingerprintConsistency(uniqueCount: number) {
  if (uniqueCount >= 4) return { score: 60, reason: `Fingerprint changed ${uniqueCount} times.` };
  if (uniqueCount === 3) return { score: 40, reason: "Fingerprint changed 3 times." };
  if (uniqueCount === 2) return { score: 20, reason: "Fingerprint changed twice." };
  return { score: 0, reason: "" };
}

export function isMeaningfulName(name: string) {
  const generic = [
    "unknown device",
    "name unavailable",
    "generic access device",
    "battery device"
  ];
  const normalized = name.trim().toLowerCase();
  return Boolean(normalized) && !generic.includes(normalized) && !normalized.startsWith("ble device (");
}

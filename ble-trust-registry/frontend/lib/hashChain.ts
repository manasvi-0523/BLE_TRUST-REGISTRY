import { sha256 } from "js-sha256";
import type { BLEDeviceScan, LedgerEntry, RiskAssessment } from "./types";

const GENESIS_HASH = "GENESIS";

export function createLedgerEntry(
  device: BLEDeviceScan,
  assessment: RiskAssessment,
  previousHash: string
): LedgerEntry {
  const reason = assessment.reasons.join("; ");
  const entryWithoutHash = {
    timestamp: new Date().toISOString(),
    deviceName: device.deviceName,
    address: device.address,
    rssi: device.rssi,
    advertisementFrequency: device.advertisementFrequency,
    serviceUuidCount: device.serviceUuidCount,
    payloadLengthApprox: device.payloadLengthApprox,
    riskScore: assessment.score,
    riskLevel: assessment.riskLevel,
    prediction: assessment.prediction,
    trustStatus: assessment.trustStatus,
    reason,
    previousHash: previousHash || GENESIS_HASH
  };

  return {
    ...entryWithoutHash,
    currentHash: hashEntryInput(entryWithoutHash)
  };
}

export function verifyLedger(entries: LedgerEntry[]) {
  let previousHash = GENESIS_HASH;
  for (const entry of entries) {
    if (entry.previousHash !== previousHash) return false;
    const expected = hashEntryInput(entry);
    if (entry.currentHash !== expected) return false;
    previousHash = entry.currentHash;
  }
  return true;
}

function hashEntryInput(entry: Omit<LedgerEntry, "currentHash"> | LedgerEntry) {
  const hashInput = [
    entry.timestamp,
    entry.deviceName,
    entry.address,
    entry.riskScore,
    entry.riskLevel,
    entry.prediction,
    entry.trustStatus,
    entry.reason,
    entry.previousHash
  ].join("|");

  return sha256(hashInput);
}

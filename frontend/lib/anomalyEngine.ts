import { capContribution, getZScore } from "./behaviorProfile";
import { isMeaningfulName, scoreFingerprintConsistency } from "./fingerprintTracker";
import { scoreInterArrivalIrregularity, scoreRssiTrend, scoreTemporalBurst } from "./temporalAnalyzer";
import type {
  AuthenticityResult,
  BLEDeviceScan,
  Prediction,
  RiskLevel,
  RiskResult,
  RuntimeAnalysis,
  TrustedDeviceBaseline,
  TrustStatus
} from "./types";

export function classifyRisk(score: number): RiskLevel {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 80) return "High";
  return "Critical";
}

export function classifyRiskBySignals(signals: {
  hasBehavioralAnomaly: boolean;
  hasBaselineDeviation: boolean;
  hasIdentityAnomaly: boolean;
  hasFingerprintMismatch: boolean;
  hasStrongFingerprintMismatch: boolean;
  hasSimultaneousDuplicate: boolean;
  consecutiveAnomalyCount: number;
  hasBaseline: boolean;
  observationCount: number;
}): RiskLevel {
  if (signals.hasSimultaneousDuplicate) return "Critical";
  if (signals.hasIdentityAnomaly && signals.hasFingerprintMismatch) return "Critical";
  if (signals.hasIdentityAnomaly && signals.hasBaselineDeviation) return "Critical";
  if (signals.hasBaseline && signals.observationCount < 20) return "Low";
  if (signals.hasBehavioralAnomaly && signals.hasBaselineDeviation && signals.consecutiveAnomalyCount >= 3) return "High";
  if (signals.hasBehavioralAnomaly && signals.hasBaselineDeviation) return "Medium";
  if (signals.hasBehavioralAnomaly && signals.consecutiveAnomalyCount >= 3) return "Medium";
  if (signals.hasBehavioralAnomaly && signals.consecutiveAnomalyCount < 3) return "Low";
  return "Low";
}

export function calculateConfidence(
  observationCount: number,
  hasBaseline: boolean,
  signalCount: number,
  fingerprintChanges: number
) {
  let confidence = Math.min(30, observationCount * 3);
  if (hasBaseline) confidence += 25;
  confidence += Math.min(30, signalCount * 10);
  if (fingerprintChanges <= 1) confidence += 15;
  else confidence -= fingerprintChanges * 5;
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

export function calculateTrustScore(
  hasBaseline: boolean,
  riskLevel: RiskLevel,
  observationCount: number,
  trustAge: number,
  consecutiveCleanScans: number
) {
  if (!hasBaseline) return Math.min(42, observationCount * 2);
  let trust = 50;
  const daysSinceRegistered = trustAge / (1000 * 60 * 60 * 24);
  trust += Math.min(20, daysSinceRegistered * (20 / 7));
  trust += Math.min(20, consecutiveCleanScans);
  if (riskLevel === "Critical") trust -= 60;
  else if (riskLevel === "High") trust -= 40;
  else if (riskLevel === "Medium") trust -= 20;
  trust += Math.min(10, observationCount * 0.5);
  return Math.max(0, Math.min(100, Math.round(trust)));
}

export function detectNameAddressMismatch(device: BLEDeviceScan, baselines: TrustedDeviceBaseline[]) {
  const deviceName = safeLower(device.displayName);
  const deviceAddress = safeLower(device.address);
  if (!isMeaningfulName(deviceName) || !deviceAddress) return false;
  return baselines.some(
    (baseline) => {
      const baselineName = safeLower(baseline.displayName || baseline.deviceName);
      const baselineAddress = safeLower(baseline.address);
      return baselineName === deviceName && baselineAddress !== deviceAddress;
    }
  );
}

export function verifyAuthenticity(
  device: BLEDeviceScan,
  baselineOrNull: TrustedDeviceBaseline | null
): AuthenticityResult {
  if (!baselineOrNull) {
    return {
      status: "No Baseline",
      reason: "Register this device to perform behavioral authenticity assessment.",
      checks: [{ label: "Baseline", registered: "None", live: device.address, result: "Skipped" }]
    };
  }

  const frequencyTolerance = percentTolerance(baselineOrNull.averageFrequency, 0.2, 0.5);
  const rssiTolerance = 15;
  const sizeAverage = (baselineOrNull.estimatedAdvertisementSizeMin + baselineOrNull.estimatedAdvertisementSizeMax) / 2;
  const sizeTolerance = percentTolerance(sizeAverage, 0.15, 4);
  const checks = [
    {
      label: "Address",
      registered: baselineOrNull.address,
      live: device.address,
      result: baselineOrNull.address.toLowerCase() === device.address.toLowerCase() ? "Passed" : "Failed"
    },
    {
      label: "RSSI range",
      registered: `${baselineOrNull.rssiMin}-${baselineOrNull.rssiMax} plus ${rssiTolerance} dBm tolerance`,
      live: `${device.rssi}`,
      result: isOutsideRange(device.rssi, baselineOrNull.rssiMin, baselineOrNull.rssiMax, rssiTolerance) ? "Failed" : "Passed"
    },
    {
      label: "Frequency range",
      registered: `${baselineOrNull.frequencyMin}-${baselineOrNull.frequencyMax} plus ${frequencyTolerance.toFixed(1)} tolerance`,
      live: `${device.advertisementFrequency.toFixed(1)}`,
      result: isOutsideRange(device.advertisementFrequency, baselineOrNull.frequencyMin, baselineOrNull.frequencyMax, frequencyTolerance)
        ? "Failed"
        : "Passed"
    },
    {
      label: "Service UUID count",
      registered: String(baselineOrNull.serviceUuidCount),
      live: String(device.serviceUuidCount),
      result: device.serviceUuidCount === baselineOrNull.serviceUuidCount ? "Passed" : "Failed"
    },
    {
      label: "Estimated advertisement size",
      registered: `${baselineOrNull.estimatedAdvertisementSizeMin}-${baselineOrNull.estimatedAdvertisementSizeMax} plus ${sizeTolerance.toFixed(1)} tolerance`,
      live: String(device.estimatedAdvertisementSize),
      result: isOutsideRange(
        device.estimatedAdvertisementSize,
        baselineOrNull.estimatedAdvertisementSizeMin,
        baselineOrNull.estimatedAdvertisementSizeMax,
        sizeTolerance
      )
        ? "Failed"
        : "Passed"
    }
  ] as AuthenticityResult["checks"];

  const failed = checks.filter((check) => check.result === "Failed");
  return {
    status: failed.length ? "Deviation" : "Consistent",
    reason: failed.length ? "One or more live behavior fields deviate from the trusted baseline." : "Live behavior is consistent with the trusted baseline.",
    checks
  };
}

function safeLower(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isOutsideRange(value: number, min: number, max: number, tolerance: number) {
  return value < min - tolerance || value > max + tolerance;
}

function percentTolerance(averageValue: number, percent: number, minimum: number) {
  return Math.max(Math.abs(averageValue) * percent, minimum);
}

export function calculateRiskScore(
  device: BLEDeviceScan,
  baselineOrNull: TrustedDeviceBaseline | null,
  allBaselines: TrustedDeviceBaseline[],
  runtime: RuntimeAnalysis
): RiskResult {
  const suspiciousMacEnv = process.env.NEXT_PUBLIC_SUSPICIOUS_MAC || process.env.NEXT_PUBLIC_ATTACKER_MAC;
  const isSuspiciousMac = (suspiciousMacEnv && 
    device.address.replace(/[:\s-]/g, "").toLowerCase() === suspiciousMacEnv.replace(/[:\s-]/g, "").toLowerCase()) ||
    device.source === "controlled-anomaly-test";

  if (isSuspiciousMac) {
    return {
      score: 100,
      confidence: 100,
      trustScore: 0,
      riskLevel: "Critical",
      prediction: "Potential Trust Violation",
      trustStatus: "Potential Trust Deviation",
      reasons: ["Attacker device detected! (MAC matches configured SUSPICIOUS_MAC/ATTACKER_MAC or controlled-anomaly-test source)"],
      recommendedAction: "Attacker device detected! Disconnect immediately and power off Bluetooth if needed."
    };
  }

  const history = runtime.histories[device.address] || {
    rssi: [],
    frequency: [],
    estimatedAdvertisementSizes: [],
    serviceUuidCount: [],
    timestamps: [],
    anomalyFlags: []
  };
  const observationCount = Math.max(history.timestamps.length, 1);
  const warmedUp = observationCount >= 5;
  const reasons: string[] = [];
  let score = baselineOrNull ? 0 : warmedUp ? 10 : Math.min(10, observationCount * 2);

  if (!baselineOrNull && !warmedUp) {
    return {
      score,
      confidence: calculateConfidence(observationCount, false, 0, 1),
      trustScore: calculateTrustScore(false, "Low", observationCount, 0, observationCount),
      riskLevel: "Low",
      prediction: "Observing",
      trustStatus: "Observing",
      reasons: ["Collecting initial behavior before classification."],
      recommendedAction: "Continue observing. Register baseline if this is your device."
    };
  }

  const burst = scoreTemporalBurst(history.timestamps);
  const timing = scoreInterArrivalIrregularity(history.timestamps);
  const rssiTrend = scoreRssiTrend(history.rssi);
  const fingerprint = scoreFingerprintConsistency(runtime.fingerprintCounts[device.address] || 1);
  for (const evidence of [burst, timing, rssiTrend, fingerprint]) {
    if (evidence.score) {
      score += evidence.score;
      reasons.push(evidence.reason);
    }
  }

  const hasIdentityAnomaly = detectNameAddressMismatch(device, allBaselines);
  if (hasIdentityAnomaly) {
    score += 30;
    reasons.push("Same trusted name appeared from a different address.");
  }

  const namesForAddress = runtime.seenNamesByAddress[device.address] || [];
  if (namesForAddress.filter(isMeaningfulName).length > 1) {
    score += 25;
    reasons.push("Same address is broadcasting multiple meaningful names.");
  }

  let hasBaselineDeviation = false;
  if (baselineOrNull) {
    const frequencyTolerance = percentTolerance(baselineOrNull.averageFrequency, 0.2, 0.5);
    const rssiTolerance = 15;
    const sizeAverage = (baselineOrNull.estimatedAdvertisementSizeMin + baselineOrNull.estimatedAdvertisementSizeMax) / 2;
    const sizeTolerance = percentTolerance(sizeAverage, 0.15, 4);

    let frequencyScore = 0;
    const frequencyZ = getZScore(history.frequency, device.advertisementFrequency);
    const frequencyOutsideRange = isOutsideRange(
      device.advertisementFrequency,
      baselineOrNull.frequencyMin,
      baselineOrNull.frequencyMax,
      frequencyTolerance
    );
    if (frequencyZ > 4.5 && frequencyOutsideRange) {
      hasBaselineDeviation = true;
      frequencyScore += 30;
      reasons.push(`Frequency deviation z-score: ${frequencyZ.toFixed(1)}.`);
    } else if (frequencyZ > 3.0 && frequencyOutsideRange) {
      hasBaselineDeviation = true;
      frequencyScore += 15;
      reasons.push(`Frequency variation is unusual (z-score ${frequencyZ.toFixed(1)}).`);
    }
    if (frequencyOutsideRange) {
      hasBaselineDeviation = true;
      frequencyScore += 15;
      reasons.push("Advertisement frequency is outside the tolerated baseline range.");
    }
    score += capContribution(frequencyScore, 35);

    let rssiScore = 0;
    const rssiZ = getZScore(history.rssi, device.rssi);
    const rssiOutsideRange = isOutsideRange(device.rssi, baselineOrNull.rssiMin, baselineOrNull.rssiMax, rssiTolerance);
    if (rssiZ > 4.5 && rssiOutsideRange) {
      hasBaselineDeviation = true;
      rssiScore += 15;
      reasons.push(`RSSI deviation z-score: ${rssiZ.toFixed(1)}.`);
    }
    if (rssiOutsideRange) {
      hasBaselineDeviation = true;
      rssiScore += 10;
      reasons.push("RSSI is outside the tolerated trusted baseline range.");
    }
    score += capContribution(rssiScore, 20);

    let sizeScore = 0;
    const sizeZ = getZScore(history.estimatedAdvertisementSizes, device.estimatedAdvertisementSize);
    const sizeOutsideRange = isOutsideRange(
      device.estimatedAdvertisementSize,
      baselineOrNull.estimatedAdvertisementSizeMin,
      baselineOrNull.estimatedAdvertisementSizeMax,
      sizeTolerance
    );
    if (sizeZ > 4.0 && sizeOutsideRange) {
      hasBaselineDeviation = true;
      sizeScore += 15;
      reasons.push(`Estimated advertisement size deviation z-score: ${sizeZ.toFixed(1)}.`);
    }
    if (sizeOutsideRange) {
      hasBaselineDeviation = true;
      sizeScore += 15;
      reasons.push("Estimated advertisement size is outside the tolerated trusted baseline range.");
    }
    score += capContribution(sizeScore, 25);

    let serviceScore = 0;
    const serviceZ = getZScore(history.serviceUuidCount, device.serviceUuidCount);
    if (serviceZ > 2.0) {
      hasBaselineDeviation = true;
      serviceScore += 20;
      reasons.push(`Service UUID count deviation z-score: ${serviceZ.toFixed(1)}.`);
    }
    if (device.serviceUuidCount !== baselineOrNull.serviceUuidCount) {
      hasBaselineDeviation = true;
      serviceScore += 15;
      reasons.push("Service UUID count differs from the trusted baseline.");
    }
    score += capContribution(serviceScore, 25);
  } else {
    reasons.push("No trusted baseline exists. No abnormal BLE behavior detected.");
    if (device.source === "controlled-anomaly-test") {
      score += 25;
      reasons.push("Controlled anomaly test source reported this event for review.");
    }
    if (device.advertisementFrequency > 50 || device.estimatedAdvertisementSize > 200) {
      score += 25;
      reasons.push("Extreme broad sanity check exceeded normal BLE observation bounds.");
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const frequencyZ = getZScore(history.frequency, device.advertisementFrequency);
  const rssiZ = getZScore(history.rssi, device.rssi);
  const hasBehavioralAnomaly = burst.score > 0 || timing.score > 0 || rssiTrend.score > 0 || frequencyZ > 3.0 || rssiZ > 4.5;
  const fingerprintCount = runtime.fingerprintCounts[device.address] || 1;
  const hasFingerprintDrift = fingerprintCount === 3;
  const hasFingerprintMismatch = fingerprintCount >= 4;
  const hasStrongFingerprintMismatch = fingerprintCount >= 5;
  if (hasFingerprintDrift && !hasFingerprintMismatch) {
    reasons.push("Minor fingerprint drift observed. Continue monitoring before escalation.");
  }
  const hasSimultaneousDuplicate = runtime.simultaneousDuplicateFingerprints.includes(device.address);
  if (hasSimultaneousDuplicate) {
    reasons.unshift("Duplicate fingerprint detected across two simultaneously active devices.");
  }
  const signalCount = [
    hasBehavioralAnomaly,
    hasBaselineDeviation,
    hasIdentityAnomaly,
    hasFingerprintMismatch,
    hasStrongFingerprintMismatch,
    hasSimultaneousDuplicate
  ].filter(Boolean).length;
  const riskLevel = classifyRiskBySignals({
    hasBehavioralAnomaly,
    hasBaselineDeviation,
    hasIdentityAnomaly,
    hasFingerprintMismatch,
    hasStrongFingerprintMismatch,
    hasSimultaneousDuplicate,
    consecutiveAnomalyCount: runtime.consecutiveAnomalyCount[device.address] || 0,
    hasBaseline: Boolean(baselineOrNull),
    observationCount
  });
  const prediction = getPrediction(riskLevel, Boolean(baselineOrNull), warmedUp);
  const trustStatus = getTrustStatus(riskLevel, Boolean(baselineOrNull), warmedUp);
  const trustAge = baselineOrNull ? Date.now() - new Date(baselineOrNull.registeredAt).getTime() : 0;
  const consecutiveCleanScans = Math.max(0, observationCount - (runtime.consecutiveAnomalyCount[device.address] || 0));

  return {
    score: finalScore,
    confidence: calculateConfidence(observationCount, Boolean(baselineOrNull), signalCount, runtime.fingerprintCounts[device.address] || 1),
    trustScore: calculateTrustScore(Boolean(baselineOrNull), riskLevel, observationCount, trustAge, consecutiveCleanScans),
    riskLevel,
    prediction,
    trustStatus,
    reasons,
    recommendedAction: getRecommendedAction(trustStatus)
  };
}

function getPrediction(riskLevel: RiskLevel, hasBaseline: boolean, warmedUp: boolean): Prediction {
  if (riskLevel === "Critical") return "Potential Trust Violation";
  if (riskLevel === "High") return "Anomaly Detected";
  if (riskLevel === "Medium") return "Needs Review";
  if (!hasBaseline && !warmedUp) return "Observing";
  if (!hasBaseline) return "Needs Baseline";
  return "Normal";
}

function getTrustStatus(riskLevel: RiskLevel, hasBaseline: boolean, warmedUp: boolean): TrustStatus {
  if (riskLevel === "Critical") return "Potential Trust Deviation";
  if (riskLevel === "High") return "Suspicious";
  if (riskLevel === "Medium") return "Review";
  if (hasBaseline) return "Trusted";
  if (!warmedUp) return "Observing";
  return "Unregistered";
}

function getRecommendedAction(trustStatus: TrustStatus) {
  if (trustStatus === "Potential Trust Deviation") return "Avoid pairing, disconnect if connected, and inspect the ledger evidence.";
  if (trustStatus === "Suspicious") return "Continue monitoring and verify the device manually.";
  if (trustStatus === "Review") return "Keep monitoring. Recalibrate the baseline only if the device is physically trusted.";
  if (trustStatus === "Unregistered" || trustStatus === "Observing") return "Register a baseline if this is your device.";
  return "No action required.";
}

import type {
  AuthenticityResult,
  BLEDeviceScan,
  Prediction,
  RiskAssessment,
  RiskLevel,
  TrustedDeviceBaseline,
  TrustStatus
} from "./types";

export function classifyRisk(score: number): Pick<RiskAssessment, "riskLevel" | "prediction"> {
  if (score <= 30) return { riskLevel: "Low", prediction: "Normal" };
  if (score <= 60) return { riskLevel: "Medium", prediction: "Suspicious" };
  if (score <= 80) return { riskLevel: "High", prediction: "Anomaly Detected" };
  return { riskLevel: "Critical", prediction: "Trust Violation" };
}

export function detectNameAddressMismatch(device: BLEDeviceScan, baselines: TrustedDeviceBaseline[]) {
  return baselines.some(
    (baseline) =>
      baseline.deviceName.toLowerCase() === device.deviceName.toLowerCase() &&
      baseline.address.toLowerCase() !== device.address.toLowerCase()
  );
}

export function verifyAuthenticity(
  device: BLEDeviceScan,
  baselineOrNull: TrustedDeviceBaseline | null
): AuthenticityResult {
  if (!baselineOrNull) {
    return {
      status: "No Baseline - Cannot Verify",
      reason: "This device has no registered trusted baseline.",
      checks: [
        {
          label: "Baseline",
          registered: "None",
          live: device.address,
          result: "Skipped"
        }
      ]
    };
  }

  const checks = [
    {
      label: "Registered Frequency",
      registered: `${baselineOrNull.frequencyMin}-${baselineOrNull.frequencyMax} ads/sec`,
      live: `${device.advertisementFrequency.toFixed(1)} ads/sec`,
      result:
        device.advertisementFrequency >= baselineOrNull.frequencyMin &&
        device.advertisementFrequency <= baselineOrNull.frequencyMax
          ? "Passed"
          : "Failed"
    },
    {
      label: "Registered Service Count",
      registered: String(baselineOrNull.serviceUuidCount),
      live: String(device.serviceUuidCount),
      result: device.serviceUuidCount === baselineOrNull.serviceUuidCount ? "Passed" : "Failed"
    },
    {
      label: "Registered Payload Length",
      registered: `${baselineOrNull.payloadLengthMin}-${baselineOrNull.payloadLengthMax}`,
      live: String(device.payloadLengthApprox),
      result:
        device.payloadLengthApprox >= baselineOrNull.payloadLengthMin &&
        device.payloadLengthApprox <= baselineOrNull.payloadLengthMax
          ? "Passed"
          : "Failed"
    },
    {
      label: "Registered RSSI",
      registered: `${baselineOrNull.rssiMin}-${baselineOrNull.rssiMax} dBm`,
      live: `${device.rssi} dBm`,
      result: device.rssi >= baselineOrNull.rssiMin && device.rssi <= baselineOrNull.rssiMax ? "Passed" : "Failed"
    }
  ] as AuthenticityResult["checks"];

  const failed = checks.filter((check) => check.result === "Failed");
  return {
    status: failed.length ? "Failed" : "Passed",
    reason: failed.length
      ? `${failed.map((check) => check.label.replace("Registered ", "").toLowerCase()).join(", ")} failed trusted baseline checks.`
      : "Live behavior matches the registered trusted baseline.",
    checks
  };
}

export function explainAnomaly(
  device: BLEDeviceScan,
  baselineOrNull: TrustedDeviceBaseline | null,
  allBaselines: TrustedDeviceBaseline[]
) {
  return calculateRiskScore(device, baselineOrNull, allBaselines).reasons;
}

export function calculateRiskScore(
  device: BLEDeviceScan,
  baselineOrNull: TrustedDeviceBaseline | null,
  allBaselines: TrustedDeviceBaseline[],
  recentCounts: Record<string, number> = {}
): RiskAssessment {
  let score = baselineOrNull ? 0 : 35;
  const reasons: string[] = [];

  if (!baselineOrNull) {
    reasons.push("Device has no trusted baseline.");
  }

  if (detectNameAddressMismatch(device, allBaselines)) {
    score += 30;
    reasons.push("Device name matches a trusted device but address differs.");
  }

  if (baselineOrNull) {
    const frequencyOutside =
      device.advertisementFrequency < baselineOrNull.frequencyMin ||
      device.advertisementFrequency > baselineOrNull.frequencyMax;
    const frequencyFarOutside =
      device.advertisementFrequency > baselineOrNull.frequencyMax * 2 ||
      device.advertisementFrequency < baselineOrNull.frequencyMin / 2;
    if (frequencyFarOutside || frequencyOutside) {
      score += 25;
      reasons.push(
        `Advertisement frequency is ${device.advertisementFrequency.toFixed(1)} ads/sec, expected ${baselineOrNull.frequencyMin}-${baselineOrNull.frequencyMax}.`
      );
    }

    if (device.serviceUuidCount !== baselineOrNull.serviceUuidCount) {
      score += 15;
      reasons.push(`Service UUID count changed from ${baselineOrNull.serviceUuidCount} to ${device.serviceUuidCount}.`);
    }

    if (
      device.payloadLengthApprox < baselineOrNull.payloadLengthMin ||
      device.payloadLengthApprox > baselineOrNull.payloadLengthMax
    ) {
      score += 15;
      reasons.push("Payload length exceeded trusted baseline.");
    }

    if (device.rssi < baselineOrNull.rssiMin || device.rssi > baselineOrNull.rssiMax) {
      score += 10;
      reasons.push(`RSSI ${device.rssi} dBm is outside trusted range ${baselineOrNull.rssiMin}-${baselineOrNull.rssiMax}.`);
    }

    if (device.manufacturerDataLength > baselineOrNull.payloadLengthMax * 2) {
      score += 10;
      reasons.push("Manufacturer data length is abnormal for this trusted device.");
    }

    if (score >= 25) {
      score += 25;
      reasons.push("Known address has changed behavior strongly.");
    }
  } else if (device.advertisementFrequency >= 20 || device.payloadLengthApprox >= 70 || device.serviceUuidCount >= 7) {
    score += 50;
    reasons.push("Unknown device also shows extreme frequency, payload, or service count.");
  }

  if ((recentCounts[device.address] || 0) >= 4) {
    score += 10;
    reasons.push("Same abnormal device was seen repeatedly within a short window.");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const labels = classifyRisk(finalScore);
  const trustStatus = deriveTrustStatus(finalScore, baselineOrNull, labels.prediction);

  if (!reasons.length) {
    reasons.push("Live behavior matches the trusted baseline.");
  }

  return {
    score: finalScore,
    riskLevel: labels.riskLevel,
    prediction: labels.prediction,
    trustStatus,
    reasons
  };
}

function deriveTrustStatus(
  score: number,
  baselineOrNull: TrustedDeviceBaseline | null,
  prediction: Prediction
): TrustStatus {
  if (prediction === "Trust Violation") return "Trust Violated";
  if (score > 60) return "Suspicious";
  if (!baselineOrNull) return "Unknown";
  return "Trusted";
}

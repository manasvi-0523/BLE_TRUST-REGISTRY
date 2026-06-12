export type ScanSource = "realtime-scanner" | "controlled-kali-test" | "demo-backup";

export type BLEDeviceScan = {
  deviceName: string;
  address: string;
  rssi: number;
  timestamp: string;
  serviceUuidCount: number;
  manufacturerDataLength: number;
  advertisementFrequency: number;
  payloadLengthApprox: number;
  source: ScanSource;
};

export type TrustedDeviceBaseline = {
  deviceName: string;
  address: string;
  rssiMin: number;
  rssiMax: number;
  averageRssi: number;
  frequencyMin: number;
  frequencyMax: number;
  averageFrequency: number;
  serviceUuidCount: number;
  payloadLengthMin: number;
  payloadLengthMax: number;
  registeredAt: string;
  trustLabel: string;
};

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type Prediction = "Normal" | "Suspicious" | "Anomaly Detected" | "Trust Violation";
export type TrustStatus = "Trusted" | "Unknown" | "Suspicious" | "Trust Violated";

export type LedgerEntry = {
  timestamp: string;
  deviceName: string;
  address: string;
  rssi: number;
  advertisementFrequency: number;
  serviceUuidCount: number;
  payloadLengthApprox: number;
  riskScore: number;
  riskLevel: RiskLevel;
  prediction: Prediction;
  trustStatus: TrustStatus;
  reason: string;
  previousHash: string;
  currentHash: string;
};

export type MonitoringState =
  | "NOT_MONITORING"
  | "BACKEND_CONNECTED"
  | "MONITORING_ACTIVE"
  | "BASELINE_TRAINING"
  | "SUSPICIOUS_ACTIVITY"
  | "TRUST_VIOLATION_DETECTED"
  | "BACKEND_DISCONNECTED";

export type ConnectionState = "Disconnected" | "Reconnecting" | "Connected";

export type RiskAssessment = {
  score: number;
  riskLevel: RiskLevel;
  prediction: Prediction;
  trustStatus: TrustStatus;
  reasons: string[];
};

export type AuthenticityResult = {
  status: "Passed" | "Failed" | "No Baseline - Cannot Verify";
  reason: string;
  checks: Array<{
    label: string;
    registered: string;
    live: string;
    result: "Passed" | "Failed" | "Skipped";
  }>;
};

export type ScannerStatusPayload = {
  running: boolean;
  connectedClients: number;
  adapterStatus: string;
  lastScanTime: string | null;
};

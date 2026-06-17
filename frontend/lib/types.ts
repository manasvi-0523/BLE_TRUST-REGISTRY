export type EventSource = "realtime-scanner" | "controlled-anomaly-test" | "demo-backup";

export type NameSource =
  | "advertised"
  | "cache"
  | "manufacturer_service"
  | "manufacturer"
  | "service_uuid"
  | "address_suffix";

export type BLEDeviceScan = {
  rawName?: string | null;
  displayName: string;
  nameSource: NameSource;
  manufacturerName?: string | null;
  deviceTypeGuess?: string | null;
  deviceName: string;
  address: string;
  rssi: number;
  timestamp: string;
  serviceUuidCount: number;
  serviceUuids: string[];
  manufacturerDataLength: number;
  advertisementFrequency: number;
  estimatedAdvertisementSize: number;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  source: EventSource;
};

export type TrustedDeviceBaseline = {
  deviceName: string;
  displayName: string;
  address: string;
  rssiMin: number;
  rssiMax: number;
  averageRssi: number;
  frequencyMin: number;
  frequencyMax: number;
  averageFrequency: number;
  serviceUuidCount: number;
  estimatedAdvertisementSizeMin: number;
  estimatedAdvertisementSizeMax: number;
  registeredAt: string;
  trustLabel: "Trusted";
};

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type Prediction =
  | "Observing"
  | "Normal"
  | "Needs Baseline"
  | "Needs Review"
  | "Suspicious"
  | "Anomaly Detected"
  | "Potential Trust Violation";

export type TrustStatus =
  | "Trusted"
  | "Observing"
  | "Unregistered"
  | "Review"
  | "Suspicious"
  | "Potential Trust Deviation";

export type RiskResult = {
  score: number;
  confidence: number;
  trustScore: number;
  riskLevel: RiskLevel;
  prediction: Prediction;
  trustStatus: TrustStatus;
  reasons: string[];
  recommendedAction: string;
};

export type LedgerEntry = {
  timestamp: string;
  deviceName: string;
  address: string;
  rssi: number;
  advertisementFrequency: number;
  serviceUuidCount: number;
  estimatedAdvertisementSize: number;
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
  | "POTENTIAL_TRUST_DEVIATION"
  | "BACKEND_DISCONNECTED";

export type ConnectionState = "Disconnected" | "Reconnecting" | "Connected";

export type DeviceHistory = {
  rssi: number[];
  frequency: number[];
  estimatedAdvertisementSizes: number[];
  serviceUuidCount: number[];
  timestamps: number[];
  anomalyFlags: boolean[];
};

export type RuntimeAnalysis = {
  histories: Record<string, DeviceHistory>;
  seenAddressesByName: Record<string, string[]>;
  seenNamesByAddress: Record<string, string[]>;
  fingerprintCounts: Record<string, number>;
  consecutiveAnomalyCount: Record<string, number>;
  simultaneousDuplicateFingerprints: string[];
};

export type AuthenticityResult = {
  status: "Consistent" | "Deviation" | "No Baseline";
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
  broadcastQueueSize: number;
};

import type { BLEDeviceScan, TrustedDeviceBaseline } from "./types";

export function createDemoBaseline(): TrustedDeviceBaseline {
  return {
    deviceName: "AirPods 280 ANC",
    address: "AA:BB:CC:11:22:33",
    rssiMin: -60,
    rssiMax: -50,
    averageRssi: -55,
    frequencyMin: 2.0,
    frequencyMax: 4.0,
    averageFrequency: 3.0,
    serviceUuidCount: 3,
    payloadLengthMin: 20,
    payloadLengthMax: 28,
    registeredAt: new Date().toISOString(),
    trustLabel: "Trusted"
  };
}

export function createDemoEvents(): BLEDeviceScan[] {
  const now = new Date();
  return [
    {
      deviceName: "AirPods 280 ANC",
      address: "AA:BB:CC:11:22:33",
      rssi: -55,
      timestamp: now.toISOString(),
      serviceUuidCount: 3,
      manufacturerDataLength: 12,
      advertisementFrequency: 3.0,
      payloadLengthApprox: 24,
      source: "demo-backup"
    },
    {
      deviceName: "AirPods 280 ANC",
      address: "FA:KE:AA:11:22:33",
      rssi: -31,
      timestamp: new Date(now.getTime() + 1000).toISOString(),
      serviceUuidCount: 7,
      manufacturerDataLength: 40,
      advertisementFrequency: 48.0,
      payloadLengthApprox: 80,
      source: "demo-backup"
    },
    {
      deviceName: "Unknown Device",
      address: "FA:KE:BB:44:55:66",
      rssi: -28,
      timestamp: new Date(now.getTime() + 2000).toISOString(),
      serviceUuidCount: 9,
      manufacturerDataLength: 44,
      advertisementFrequency: 52.0,
      payloadLengthApprox: 92,
      source: "demo-backup"
    }
  ];
}

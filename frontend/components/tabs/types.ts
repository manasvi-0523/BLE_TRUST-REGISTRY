import type { BLEDeviceScan, RiskResult } from "@/lib/types";

export type DeviceRow = BLEDeviceScan & RiskResult & { observations: number };


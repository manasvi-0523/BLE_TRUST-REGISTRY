"use client";

import { motion } from "framer-motion";
import type { RiskAssessment, BLEDeviceScan } from "@/lib/types";

export function AlertBanner({
  assessment,
  device
}: {
  assessment: RiskAssessment | null;
  device: BLEDeviceScan | null;
}) {
  const state =
    !assessment || assessment.riskLevel === "Low"
      ? "green"
      : assessment.riskLevel === "Medium"
        ? "yellow"
        : "red";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        state === "red"
          ? "rounded-lg border border-rose-400/40 bg-rose-500/18 p-4 shadow-glow"
          : state === "yellow"
            ? "rounded-lg border border-amber-300/40 bg-amber-400/14 p-4"
            : "rounded-lg border border-emerald-300/30 bg-emerald-400/12 p-4"
      }
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Trust Violation Alert Bar</p>
          <h1 className="mt-1 text-2xl font-bold">
            {state === "red"
              ? "TRUST VIOLATION DETECTED"
              : state === "yellow"
                ? "Suspicious BLE Activity"
                : "System Secure"}
          </h1>
          <p className="text-sm text-slate-300">
            {state === "red"
              ? "Possible BLE spoofing/anomaly found near your device."
              : state === "yellow"
                ? "Unusual BLE behavior found. Continue monitoring."
                : "No suspicious BLE behavior detected."}
          </p>
        </div>
        {state === "red" && assessment && device && (
          <div className="grid gap-1 text-sm text-slate-100">
            <span>{device.deviceName} | {device.address}</span>
            <span>{assessment.riskLevel} | Score {assessment.score}</span>
            <span>{assessment.reasons[0]}</span>
            <span className="font-semibold">Action: Avoid pairing, disconnect if connected, verify manually, check ledger.</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

"use client";

import { Activity } from "lucide-react";
import { motion } from "framer-motion";

export function ThreatRadar({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-lg border border-line bg-slate-950/40">
      <div className="absolute h-40 w-40 rounded-full border border-cyan-300/20" />
      <div className="absolute h-28 w-28 rounded-full border border-cyan-300/20" />
      <div className="absolute h-16 w-16 rounded-full border border-cyan-300/20" />
      <motion.div
        className="absolute h-44 w-1 origin-bottom rounded-full bg-cyan-300/40"
        animate={{ rotate: active ? 360 : 0 }}
        transition={{ duration: 3, repeat: active ? Infinity : 0, ease: "linear" }}
      />
      {active && <div className="pulse-ring absolute h-28 w-28 rounded-full border border-cyan-300" />}
      <div className="relative z-10 rounded-full border border-cyan-300/40 bg-slate-950 p-4 text-cyan-200">
        <Activity size={28} />
      </div>
    </div>
  );
}

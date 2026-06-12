export function scoreTemporalBurst(timestamps: number[]) {
  const now = timestamps.at(-1) || Date.now();
  const within = (ms: number) => timestamps.filter((timestamp) => now - timestamp <= ms).length;
  const fiveSeconds = within(5000);
  const thirtySeconds = within(30000);
  const sixtySeconds = within(60000);

  if (fiveSeconds > 20) return { score: 90, reason: `Advertisement burst: ${fiveSeconds} events in 5 seconds.` };
  if (fiveSeconds > 10) return { score: 70, reason: `Advertisement burst: ${fiveSeconds} events in 5 seconds.` };
  if (thirtySeconds > 40) return { score: 60, reason: `Sustained BLE burst: ${thirtySeconds} events in 30 seconds.` };
  if (sixtySeconds > 80) return { score: 50, reason: `Sustained BLE burst: ${sixtySeconds} events in 60 seconds.` };
  return { score: 0, reason: "" };
}

export function scoreInterArrivalIrregularity(timestamps: number[]) {
  if (timestamps.length < 6) return { score: 0, reason: "" };
  const intervals = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]).filter((value) => value > 0);
  if (intervals.length < 5) return { score: 0, reason: "" };
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const variance = intervals.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / intervals.length;
  const cv = Math.sqrt(variance) / mean;
  if (cv < 0.05) return { score: 40, reason: "Timing pattern is suspiciously regular." };
  if (cv > 3.0) return { score: 50, reason: "Timing pattern is chaotic and flood-like." };
  return { score: 0, reason: "" };
}

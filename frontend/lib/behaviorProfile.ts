export function getZScore(history: number[], newValue: number): number {
  if (history.length < 5) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / history.length;
  const std = Math.sqrt(variance);
  const effectiveStd = Math.max(std, 1);
  return Math.abs(newValue - mean) / effectiveStd;
}

export function capContribution(value: number, cap: number) {
  return Math.min(value, cap);
}

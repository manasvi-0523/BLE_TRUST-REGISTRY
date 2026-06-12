export function getZScore(history: number[], newValue: number): number {
  if (history.length < 5) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / history.length;
  const std = Math.sqrt(variance);
  if (std === 0) return newValue === mean ? 0 : 5;
  return Math.abs(newValue - mean) / std;
}

export function capContribution(value: number, cap: number) {
  return Math.min(value, cap);
}

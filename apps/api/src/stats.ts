import type { RequestResult, TestSummary } from './types.js';

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: number[]) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

export function buildSummary(results: RequestResult[]): TestSummary {
  const durations = results.map((item) => item.durationMs);
  const speeds = results.map((item) => item.speedBps);
  const ttfbValues = results.map((item) => item.ttfbMs);

  return {
    totalBytes: results.reduce((sum, item) => sum + item.bytes, 0),
    totalDurationMs: durations.reduce((sum, value) => sum + value, 0),
    averageDurationMs: average(durations),
    medianDurationMs: median(durations),
    minDurationMs: Math.min(...durations),
    maxDurationMs: Math.max(...durations),
    stdDevDurationMs: standardDeviation(durations),
    averageSpeedBps: average(speeds),
    minSpeedBps: Math.min(...speeds),
    maxSpeedBps: Math.max(...speeds),
    speedRangeBps: Math.max(...speeds) - Math.min(...speeds),
    averageTtfbMs: average(ttfbValues),
    minTtfbMs: Math.min(...ttfbValues),
    maxTtfbMs: Math.max(...ttfbValues),
  };
}

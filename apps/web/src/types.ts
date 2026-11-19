export type RequestResult = {
  number: number;
  bytes: number;
  durationMs: number;
  ttfbMs: number;
  speedBps: number;
};

export type TestSummary = {
  totalBytes: number;
  totalDurationMs: number;
  averageDurationMs: number;
  medianDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  stdDevDurationMs: number;
  averageSpeedBps: number;
  minSpeedBps: number;
  maxSpeedBps: number;
  speedRangeBps: number;
  averageTtfbMs: number;
  minTtfbMs: number;
  maxTtfbMs: number;
};

export type StoredTest = TestSummary & {
  id: number;
  url: string;
  testedAt: string;
  imageType: string;
  imageSize: number;
  requests: RequestResult[];
};

export type StreamEvent =
  | { type: 'started'; total: number; url: string }
  | { type: 'request-started'; number: number }
  | { type: 'request-complete'; result: RequestResult }
  | { type: 'complete'; test: { id: number; url: string; summary: TestSummary } }
  | { type: 'error'; message: string };

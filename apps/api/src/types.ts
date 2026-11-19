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

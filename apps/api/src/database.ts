import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import type { RequestResult, StoredTest, TestSummary } from './types.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH
  || resolve(currentDir, '../../../data/speed-tests.db');
mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS speed_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    tested_at TEXT NOT NULL,
    image_data BLOB NOT NULL,
    image_type TEXT NOT NULL,
    image_size INTEGER NOT NULL,
    total_bytes INTEGER NOT NULL,
    total_duration_ms REAL NOT NULL,
    average_duration_ms REAL NOT NULL,
    median_duration_ms REAL NOT NULL,
    min_duration_ms REAL NOT NULL,
    max_duration_ms REAL NOT NULL,
    std_dev_duration_ms REAL NOT NULL,
    average_speed_bps REAL NOT NULL,
    min_speed_bps REAL NOT NULL,
    max_speed_bps REAL NOT NULL,
    speed_range_bps REAL NOT NULL,
    average_ttfb_ms REAL NOT NULL,
    min_ttfb_ms REAL NOT NULL,
    max_ttfb_ms REAL NOT NULL,
    requests_json TEXT NOT NULL
  );
`);

type TestInput = {
  url: string;
  image: Buffer;
  imageType: string;
  results: RequestResult[];
  summary: TestSummary;
};

export function saveTest(input: TestInput) {
  const statement = db.prepare(`
    INSERT INTO speed_tests (
      url, tested_at, image_data, image_type, image_size, total_bytes,
      total_duration_ms, average_duration_ms, median_duration_ms,
      min_duration_ms, max_duration_ms, std_dev_duration_ms,
      average_speed_bps, min_speed_bps, max_speed_bps, speed_range_bps,
      average_ttfb_ms, min_ttfb_ms, max_ttfb_ms, requests_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const s = input.summary;
  const result = statement.run(
    input.url, new Date().toISOString(), input.image, input.imageType,
    input.image.length, s.totalBytes, s.totalDurationMs, s.averageDurationMs,
    s.medianDurationMs, s.minDurationMs, s.maxDurationMs,
    s.stdDevDurationMs, s.averageSpeedBps, s.minSpeedBps, s.maxSpeedBps,
    s.speedRangeBps, s.averageTtfbMs, s.minTtfbMs, s.maxTtfbMs,
    JSON.stringify(input.results),
  );
  return Number(result.lastInsertRowid);
}

function mapRow(row: Record<string, unknown>): StoredTest {
  return {
    id: Number(row.id), url: String(row.url), testedAt: String(row.tested_at),
    imageType: String(row.image_type), imageSize: Number(row.image_size),
    totalBytes: Number(row.total_bytes), totalDurationMs: Number(row.total_duration_ms),
    averageDurationMs: Number(row.average_duration_ms), medianDurationMs: Number(row.median_duration_ms),
    minDurationMs: Number(row.min_duration_ms), maxDurationMs: Number(row.max_duration_ms),
    stdDevDurationMs: Number(row.std_dev_duration_ms), averageSpeedBps: Number(row.average_speed_bps),
    minSpeedBps: Number(row.min_speed_bps), maxSpeedBps: Number(row.max_speed_bps),
    speedRangeBps: Number(row.speed_range_bps), averageTtfbMs: Number(row.average_ttfb_ms),
    minTtfbMs: Number(row.min_ttfb_ms), maxTtfbMs: Number(row.max_ttfb_ms),
    requests: JSON.parse(String(row.requests_json)) as RequestResult[],
  };
}

export function listTests() {
  const rows = db.prepare('SELECT * FROM speed_tests ORDER BY tested_at DESC').all();
  return rows.map((row) => mapRow(row as Record<string, unknown>));
}

export function getImage(id: number) {
  return db.prepare('SELECT image_data, image_type FROM speed_tests WHERE id = ?').get(id) as
    | { image_data: Uint8Array; image_type: string }
    | undefined;
}

export function deleteTest(id: number) {
  return db.prepare('DELETE FROM speed_tests WHERE id = ?').run(id).changes > 0;
}

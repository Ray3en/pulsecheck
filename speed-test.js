#!/usr/bin/env node

const http = require('node:http');
const https = require('node:https');
const { performance } = require('node:perf_hooks');

const REQUEST_COUNT = 10;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;

function fetchUrl(url, timeoutMs, redirectsLeft, testStartedAt) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const timing = {};
    let downloadedBytes = 0;

    const request = client.get(url, {
      headers: { 'User-Agent': 'internet-speed-test/1.0' },
    }, (response) => {
      timing.firstByte = performance.now();

      const isRedirect = response.statusCode >= 300
        && response.statusCode < 400
        && response.headers.location;

      if (isRedirect) {
        response.resume();

        if (redirectsLeft === 0) {
          const error = new Error('too many redirects');
          error.statusCode = response.statusCode;
          reject(error);
          return;
        }

        const redirectUrl = new URL(response.headers.location, url);
        fetchUrl(
          redirectUrl,
          timeoutMs,
          redirectsLeft - 1,
          testStartedAt,
        ).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        const error = new Error(`server returned HTTP ${response.statusCode}`);
        error.statusCode = response.statusCode;
        reject(error);
        return;
      }

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });

      response.on('end', () => {
        const finishedAt = performance.now();
        resolve({
          bytes: downloadedBytes,
          durationMs: finishedAt - testStartedAt,
          ttfbMs: timing.firstByte - testStartedAt,
        });
      });

      response.on('error', reject);
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`request timed out after ${timeoutMs} ms`));
    });

    request.on('error', reject);
  });
}

function download(url, timeoutMs) {
  const startedAt = performance.now();
  return fetchUrl(url, timeoutMs, MAX_REDIRECTS, startedAt);
}

function formatValue(value, units) {
  if (!Number.isFinite(value)) return 'n/a';

  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function formatBytes(bytes) {
  return formatValue(bytes, ['B', 'KB', 'MB', 'GB', 'TB']);
}

function formatBitRate(bytes, milliseconds) {
  return formatValue((bytes * 8 * 1000) / milliseconds, [
    'bit/s', 'Kbit/s', 'Mbit/s', 'Gbit/s', 'Tbit/s',
  ]);
}

function formatDuration(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds.toFixed(2)} ms`;

  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(3)} s`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  if (totalMinutes < 60) {
    return `${String(totalMinutes).padStart(2, '0')}:${remainingSeconds}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}:${remainingSeconds}`;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, percent) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percent;
  const lower = Math.floor(position);
  const fraction = position - lower;

  if (sorted[lower + 1] === undefined) return sorted[lower];
  return sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

function standardDeviation(values) {
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function stats(values) {
  return {
    average: average(values),
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    median: percentile(values, 0.5),
    stdDev: standardDeviation(values),
  };
}

function printStats(title, values, formatter) {
  const result = stats(values);
  console.log(`\n${title}`);
  console.log(`  Average:  ${formatter(result.average)}`);
  console.log(`  Median:   ${formatter(result.median)}`);
  console.log(`  Minimum:  ${formatter(result.minimum)}`);
  console.log(`  Maximum:  ${formatter(result.maximum)}`);
  console.log(`  Std dev:  ${formatter(result.stdDev)}`);
}

function printHelp() {
  console.log(`Usage: node speed-test.js <url> [--timeout <seconds>]

Downloads the URL 10 times sequentially and prints download statistics.

Options:
  --timeout <seconds>  Timeout for one request (default: 30)
  -h, --help           Show this help`);
}

function parseArguments(args) {
  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (!args[0]) throw new Error('URL is required. Run with --help to see usage.');

  let url;
  try {
    url = new URL(args[0]);
  } catch {
    throw new Error('invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('only HTTP and HTTPS URLs are supported');
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1) {
    const seconds = Number(args[timeoutIndex + 1]);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      throw new Error('--timeout must be a number greater than zero');
    }
    timeoutMs = seconds * 1000;
  }

  return { url, timeoutMs };
}

async function main() {
  const { url, timeoutMs } = parseArguments(process.argv.slice(2));
  const results = [];
  const testStartedAt = performance.now();

  console.log(`URL: ${url.href}`);
  console.log(`Requests: ${REQUEST_COUNT}\n`);

  for (let number = 1; number <= REQUEST_COUNT; number += 1) {
    const result = await download(url, timeoutMs);
    results.push(result);
    console.log(
      `${String(number).padStart(2)}/${REQUEST_COUNT}: `
        + `${formatDuration(result.durationMs)}, ${formatBytes(result.bytes)}, `
        + `${formatBitRate(result.bytes, result.durationMs)}`,
    );
  }

  const testDurationMs = performance.now() - testStartedAt;
  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);

  console.log('\nSummary');
  console.log(`  Total test time:     ${formatDuration(testDurationMs)}`);
  console.log(`  Downloaded in total: ${formatBytes(totalBytes)}`);

  const durations = results.map((result) => result.durationMs);
  const ttfbValues = results.map((result) => result.ttfbMs);
  const speeds = results.map((result) => (result.bytes * 8 * 1000) / result.durationMs);
  const formatSpeed = (value) => formatValue(value, [
    'bit/s', 'Kbit/s', 'Mbit/s', 'Gbit/s', 'Tbit/s',
  ]);

  printStats('Request time', durations, formatDuration);

  const speedStats = stats(speeds);
  console.log('\nDownload speed');
  console.log(`  Average: ${formatSpeed(speedStats.average)}`);
  console.log(`  Minimum: ${formatSpeed(speedStats.minimum)}`);
  console.log(`  Maximum: ${formatSpeed(speedStats.maximum)}`);
  console.log(`  Range:   ${formatSpeed(speedStats.maximum - speedStats.minimum)}`);

  const ttfbStats = stats(ttfbValues);
  console.log('\nTime to first byte (TTFB)');
  console.log(`  Average: ${formatDuration(ttfbStats.average)}`);
  console.log(`  Minimum: ${formatDuration(ttfbStats.minimum)}`);
  console.log(`  Maximum: ${formatDuration(ttfbStats.maximum)}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

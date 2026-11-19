import { performance } from 'node:perf_hooks';
import type { RequestResult } from './types.js';

export type DownloadResult = RequestResult & {
  body: Buffer;
  contentType: string;
};

export async function downloadImage(
  url: string,
  number: number,
  timeoutMs = 30_000,
): Promise<DownloadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'pulsecheck/1.0' },
      redirect: 'follow',
    });
    const firstByteAt = performance.now();

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    if (!response.body) throw new Error('Сервер вернул пустой ответ');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      await response.body.cancel();
      throw new Error('Указанная ссылка не является картинкой.');
    }

    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      chunks.push(buffer);
      bytes += buffer.length;
    }

    const durationMs = performance.now() - startedAt;
    return {
      number,
      bytes,
      durationMs,
      ttfbMs: firstByteAt - startedAt,
      speedBps: (bytes * 8 * 1000) / durationMs,
      body: Buffer.concat(chunks),
      contentType,
    };
  } finally {
    clearTimeout(timeout);
  }
}

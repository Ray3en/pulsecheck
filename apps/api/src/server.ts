import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSummary } from './stats.js';
import { downloadImage } from './speed-test.js';
import { deleteTest, getImage, listTests, saveTest } from './database.js';
import type { RequestResult } from './types.js';

const app = express();
const port = Number(process.env.PORT || 4000);
app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => response.json({ ok: true }));
app.get('/api/tests', (_request, response) => response.json(listTests()));
app.get('/api/tests/:id/image', (request, response) => {
  const image = getImage(Number(request.params.id));
  if (!image) return response.status(404).json({ message: 'Изображение не найдено' });
  response.type(image.image_type);
  response.setHeader('Cache-Control', 'public, max-age=86400');
  return response.send(Buffer.from(image.image_data));
});
app.delete('/api/tests/:id', (request, response) => {
  const deleted = deleteTest(Number(request.params.id));
  if (!deleted) return response.status(404).json({ message: 'Отчёт не найден' });
  return response.status(204).end();
});

app.post('/api/tests', async (request, response) => {
  let url: URL;
  const attempts = Number(request.body.attempts ?? 10);
  try {
    url = new URL(String(request.body.url || ''));
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    return response.status(400).json({ message: 'Укажите корректный HTTP или HTTPS URL' });
  }
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 50) {
    return response.status(400).json({ message: 'Количество попыток должно быть целым числом от 1 до 50' });
  }

  response.status(200);
  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.flushHeaders();
  const send = (event: unknown) => response.write(`${JSON.stringify(event)}\n`);
  send({ type: 'started', total: attempts, url: url.href });

  const results: RequestResult[] = [];
  let storedImage: Buffer | null = null;
  let imageType = 'application/octet-stream';

  try {
    for (let number = 1; number <= attempts; number += 1) {
      send({ type: 'request-started', number });
      const download = await downloadImage(url.href, number);
      const { body, contentType, ...result } = download;
      if (!storedImage) {
        storedImage = body;
        imageType = contentType;
      }
      results.push(result);
      send({ type: 'request-complete', result });
    }

    const summary = buildSummary(results);
    const id = saveTest({ url: url.href, image: storedImage!, imageType, results, summary });
    send({ type: 'complete', test: { id, url: url.href, summary } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    send({ type: 'error', message });
  } finally {
    response.end();
  }
});

const currentDir = dirname(fileURLToPath(import.meta.url));
const webDist = resolve(currentDir, '../../web/dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
    return response.sendFile(resolve(webDist, 'index.html'));
  });
}

app.listen(port, () => console.log(`Pulsecheck API: http://localhost:${port}`));

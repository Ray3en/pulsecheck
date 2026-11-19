import type { StoredTest, StreamEvent } from './types';

export async function runTest(url: string, attempts: number, onEvent: (event: StreamEvent) => void) {
  const response = await fetch('/api/tests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, attempts }),
  });
  if (!response.ok || !response.body) throw new Error('Не удалось запустить тест');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as StreamEvent);
    }
    if (done) break;
  }
}

export async function getTests(): Promise<StoredTest[]> {
  const response = await fetch('/api/tests');
  if (!response.ok) throw new Error('Не удалось загрузить историю');
  return response.json() as Promise<StoredTest[]>;
}

export async function deleteTest(id: number) {
  const response = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Не удалось удалить отчёт');
}

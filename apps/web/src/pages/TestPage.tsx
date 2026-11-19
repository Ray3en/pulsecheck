import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { runTest } from '../api';
import { SummaryCards } from '../components/SummaryCards';
import { Terminal } from '../components/Terminal';
import type { RequestResult, TestSummary } from '../types';

const schema = z.object({
  url: z.url('Введите корректный URL').refine(
    (value) => value.startsWith('http://') || value.startsWith('https://'),
    'Поддерживаются только HTTP и HTTPS адреса',
  ),
  attempts: z.string()
    .trim()
    .regex(/^\d+$/, 'Введите целое число')
    .transform(Number)
    .pipe(z.number().int().min(1, 'Минимум 1 попытка').max(50, 'Максимум 50 попыток')),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function TestPage() {
  const [searchParams] = useSearchParams();
  const initialAttempts = searchParams.get('attempts') || '10';
  const [results, setResults] = useState<RequestResult[]>([]);
  const [activeRequest, setActiveRequest] = useState<number | null>(null);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [testId, setTestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [running, setRunning] = useState(false);
  const [attempts, setAttempts] = useState(Number(initialAttempts) || 10);
  const { register, handleSubmit, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { url: searchParams.get('url') || '', attempts: initialAttempts },
  });

  const onSubmit = handleSubmit(async ({ url, attempts: attemptsCount }) => {
    setAttempts(attemptsCount);
    setResults([]); setSummary(null); setTestId(null); setError(null); setImageError(false); setRunning(true);
    try {
      await runTest(url, attemptsCount, (event) => {
        if (event.type === 'request-started') setActiveRequest(event.number);
        if (event.type === 'request-complete') setResults((current) => [...current, event.result]);
        if (event.type === 'complete') {
          setSummary(event.test.summary); setTestId(event.test.id); setActiveRequest(null);
        }
        if (event.type === 'error') throw new Error(event.message);
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Тест завершился с ошибкой';
      if (message === 'Указанная ссылка не является картинкой.') {
        setImageError(true);
        window.setTimeout(() => setImageError(false), 2000);
      } else {
        setError(message);
      }
      setActiveRequest(null);
    } finally { setRunning(false); }
  });

  return <div className="page test-page">
    <section className="hero">
      <div className="eyebrow"><span /> network performance lab</div>
    </section>

    <form className="url-form" onSubmit={onSubmit}>
      <div className="form-fields">
        <label className={`url-field ${errors.url ? 'invalid' : ''}`}>
          <ImageIcon size={18} />
          <input {...register('url')} aria-label="URL изображения" placeholder="https://example.com/large-image.jpg" disabled={running} />
        </label>
        <label className={`attempts-field ${errors.attempts ? 'invalid' : ''}`}>
          <span>Попытки</span>
          <input {...register('attempts')} inputMode="numeric" aria-label="Количество попыток" disabled={running} />
        </label>
        <button disabled={running} type="submit">{running ? 'Тест идёт' : 'Запустить'} <ArrowRight size={18} /></button>
      </div>
      <div className="form-meta">
        <span className={errors.url ? 'field-error' : ''}>{errors.url?.message || 'Прямая ссылка на изображение или файл'}</span>
        {errors.attempts && <span className="field-error">{errors.attempts.message}</span>}
      </div>
    </form>

    <Terminal results={results} activeRequest={activeRequest} running={running} error={error} total={attempts} />
    {imageError && <div className="image-error-toast" role="alert">Указанная ссылка не является картинкой.</div>}
    {summary && <section className="results-section">
      <div className="section-heading"><span>Итоговый отчёт</span>
        {testId && <img src={`/api/tests/${testId}/image`} alt="Протестированное изображение" />}
      </div>
      <SummaryCards summary={summary} />
    </section>}
  </div>;
}

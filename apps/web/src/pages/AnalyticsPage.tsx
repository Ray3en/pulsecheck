import { ArrowDownUp, BarChart3, Database, ImageOff, Repeat2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteTest, getTests } from '../api';
import { formatBytes, formatDate, formatDuration, formatSpeed } from '../format';
import type { StoredTest } from '../types';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<StoredTest[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { getTests().then(setTests).catch((value: Error) => setError(value.message)); }, []);

  const repeatTest = (test: StoredTest) => {
    const query = new URLSearchParams({
      url: test.url,
      attempts: String(test.requests.length),
    });
    navigate(`/?${query.toString()}`);
  };

  const removeTest = async (test: StoredTest) => {
    if (!window.confirm(`Удалить отчёт #${test.id}?`)) return;
    try {
      await deleteTest(test.id);
      setTests((current) => current.filter((item) => item.id !== test.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить отчёт');
    }
  };

  const fastest = tests.length ? Math.max(...tests.map((test) => test.averageSpeedBps)) : 0;
  return <div className="page analytics-page">
    <section className="analytics-head">
      <div><div className="eyebrow"><span /> saved locally</div><h1>История тестов</h1><p>Сравнивайте скорость, задержки и стабильность загрузки во времени.</p></div>
      <div className="history-kpi"><Database size={18} /><span>Записей в SQLite</span><strong>{tests.length}</strong></div>
      <div className="history-kpi accent"><BarChart3 size={18} /><span>Лучший результат</span><strong>{formatSpeed(fastest)}</strong></div>
    </section>

    <section className="table-card">
      <div className="table-title"><div><h2>Сравнение результатов</h2><p>Все измерения отсортированы от новых к старым</p></div><ArrowDownUp size={18} /></div>
      {error && <div className="empty-state">{error}</div>}
      {!error && tests.length === 0 && <div className="empty-state"><ImageOff size={32} /><h3>Пока нет измерений</h3><p>Запустите первый тест — отчёт появится здесь.</p></div>}
      {tests.length > 0 && <div className="table-scroll"><table>
        <thead><tr><th>Изображение и дата</th><th>URL</th><th>Скорость</th><th>Время</th><th>TTFB</th><th>Стабильность</th><th>Объём</th><th>Действия</th></tr></thead>
        <tbody>{tests.map((test) => <tr key={test.id}>
          <td><div className="image-cell"><img src={`/api/tests/${test.id}/image`} alt="" /><div><strong>Тест #{test.id}</strong><span>{formatDate(test.testedAt)}</span></div></div></td>
          <td><a href={test.url} target="_blank" rel="noreferrer" title={test.url}>{new URL(test.url).hostname}</a></td>
          <td><strong className="speed-value">{formatSpeed(test.averageSpeedBps)}</strong><small>{formatSpeed(test.minSpeedBps)} — {formatSpeed(test.maxSpeedBps)}</small></td>
          <td>{formatDuration(test.averageDurationMs)}<small>median {formatDuration(test.medianDurationMs)}</small></td>
          <td>{formatDuration(test.averageTtfbMs)}</td>
          <td>± {formatDuration(test.stdDevDurationMs)}</td>
          <td>{formatBytes(test.totalBytes)}<small>image {formatBytes(test.imageSize)}</small></td>
          <td><div className="row-actions">
            <button type="button" onClick={() => repeatTest(test)}><Repeat2 size={14} /> Повторить</button>
            <button className="delete-button" type="button" onClick={() => removeTest(test)} aria-label={`Удалить отчёт ${test.id}`}><Trash2 size={14} /></button>
          </div></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>;
}

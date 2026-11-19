import { Clock3, Gauge, TimerReset, Weight } from 'lucide-react';
import { formatBytes, formatDuration, formatSpeed } from '../format';
import type { TestSummary } from '../types';

export function SummaryCards({ summary }: { summary: TestSummary }) {
  const cards = [
    { label: 'Средняя скорость', value: formatSpeed(summary.averageSpeedBps), icon: Gauge },
    { label: 'Среднее время', value: formatDuration(summary.averageDurationMs), icon: Clock3 },
    { label: 'Средний TTFB', value: formatDuration(summary.averageTtfbMs), icon: TimerReset },
    { label: 'Скачано всего', value: formatBytes(summary.totalBytes), icon: Weight },
  ];
  return <div className="summary-grid">{cards.map(({ label, value, icon: Icon }) => (
    <article className="metric-card" key={label}><Icon size={18} /><span>{label}</span><strong>{value}</strong></article>
  ))}</div>;
}

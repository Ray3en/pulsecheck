import { Check, Circle, LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatBytes, formatDuration, formatSpeed } from '../format';
import type { RequestResult } from '../types';

type Props = {
  results: RequestResult[];
  activeRequest: number | null;
  running: boolean;
  error: string | null;
  total: number;
};

export function Terminal({ results, activeRequest, running, error, total }: Props) {
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const resizeTerminal = () => {
      const terminal = terminalRef.current;
      if (!terminal) return;
      const availableHeight = window.innerHeight - terminal.getBoundingClientRect().top - 20;
      terminal.style.height = `${Math.max(260, availableHeight)}px`;
    };
    resizeTerminal();
    window.addEventListener('resize', resizeTerminal);
    return () => window.removeEventListener('resize', resizeTerminal);
  }, []);

  useEffect(() => {
    const output = outputRef.current;
    if (!output) return;
    output.scrollTo({ top: output.scrollHeight, behavior: 'smooth' });
  }, [results, activeRequest, error]);

  return (
    <section className="terminal" aria-live="polite" ref={terminalRef}>
      <div className="terminal-bar">
        <div className="traffic-lights"><i /><i /><i /></div>
      </div>
      <div className="terminal-body" ref={outputRef}>
        <p><span className="prompt">pulsecheck ~ %</span> run download-test --requests {total}</p>
        {!running && results.length === 0 && !error && (
          <p className="muted">Ожидание URL. Результаты появятся здесь по мере выполнения.</p>
        )}
        {Array.from({
          length: results.length === total ? total : Math.max(results.length, activeRequest || 0),
        }, (_, index) => index + 1).map((number) => {
          const result = results.find((item) => item.number === number);
          const active = activeRequest === number;
          return (
            <div className={`terminal-line ${result ? 'done' : active ? 'active' : ''}`} key={number}>
              <span className="line-icon">
                {result ? <Check size={14} /> : active ? <LoaderCircle size={14} /> : <Circle size={10} />}
              </span>
              <span className="request-label">request {String(number).padStart(2, '0')}/{total}</span>
              {result ? (
                <span className="request-result">
                  {formatDuration(result.durationMs)} · {formatBytes(result.bytes)} · <b>{formatSpeed(result.speedBps)}</b> · TTFB {formatDuration(result.ttfbMs)}
                </span>
              ) : active ? <span className="muted">downloading…</span> : <span className="muted">queued</span>}
            </div>
          );
        })}
        {error && <p className="terminal-error">error: {error}</p>}
        {results.length === total && <p><span className="prompt">pulsecheck ~ %</span> <span className="cursor">▋</span></p>}
      </div>
    </section>
  );
}

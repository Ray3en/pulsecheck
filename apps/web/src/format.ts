export function formatValue(value: number, units: string[]) {
  let index = 0;
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000;
    index += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[index]}`;
}

export const formatBytes = (value: number) =>
  formatValue(value, ['B', 'KB', 'MB', 'GB', 'TB']);

export const formatSpeed = (value: number) =>
  formatValue(value, ['bit/s', 'Kbit/s', 'Mbit/s', 'Gbit/s', 'Tbit/s']);

export function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return `${milliseconds.toFixed(2)} ms`;

  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(2)} s`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  if (totalMinutes < 60) {
    return `${String(totalMinutes).padStart(2, '0')}:${remainingSeconds}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${remainingSeconds}`;
}

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));

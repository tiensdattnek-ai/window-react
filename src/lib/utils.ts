export const uid = () => crypto.randomUUID();
export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));
export const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;
export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function download(content: string | Blob, name: string, type = 'text/plain') {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function relativeDate(time: number) {
  const delta = Date.now() - time;
  if (delta < 60000) return 'Just now';
  if (delta < 3600000) return `${Math.floor(delta / 60000)} min ago`;
  if (delta < 86400000) return 'Today';
  if (delta < 172800000) return 'Yesterday';
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function weatherLabel(code: number) {
  if (code === 0) return 'Clear skies';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'A little misty';
  if (code <= 67) return 'Rainy skies';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Passing showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}

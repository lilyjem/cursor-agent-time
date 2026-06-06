// 把毫秒时长格式化为人类可读字符串：<60s -> "42s"；<1h -> "1m23s"；否则 "1h2m"
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '--';
  }
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) {
    return `${totalMin}m${sec}s`;
  }
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${hours}h${min}m`;
}

// 把 ISO 时间字符串格式化为本地时区的 "YYYY-MM-DD HH:mm:ss"；
// 空串/非字符串/无法解析一律返回空串，由调用方决定是否展示。
export function formatDateTime(iso: string): string {
  if (typeof iso !== 'string' || iso === '') {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const pad = (n: number): string => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  const second = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

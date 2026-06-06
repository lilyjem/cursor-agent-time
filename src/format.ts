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

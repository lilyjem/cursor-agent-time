import { describe, it, expect } from 'vitest';
import { formatDuration, formatDateTime } from '../src/format';

describe('formatDuration', () => {
  it('不足 1 分钟显示秒', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(42000)).toBe('42s');
    expect(formatDuration(59000)).toBe('59s');
  });
  it('1 分钟到 1 小时显示分秒', () => {
    expect(formatDuration(60000)).toBe('1m0s');
    expect(formatDuration(83000)).toBe('1m23s');
  });
  it('1 小时以上显示时分', () => {
    expect(formatDuration(3600000)).toBe('1h0m');
    expect(formatDuration(3720000)).toBe('1h2m');
  });
  it('非法输入显示占位符', () => {
    expect(formatDuration(-5)).toBe('--');
    expect(formatDuration(NaN)).toBe('--');
  });
});

describe('formatDateTime', () => {
  it('正常 ISO 转为本地 YYYY-MM-DD HH:mm:ss', () => {
    const d = new Date(2026, 5, 6, 16, 22, 1); // 本地 2026-06-06 16:22:01
    expect(formatDateTime(d.toISOString())).toBe('2026-06-06 16:22:01');
  });
  it('月日时分秒按需补零', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5); // 本地 2026-01-02 03:04:05
    expect(formatDateTime(d.toISOString())).toBe('2026-01-02 03:04:05');
  });
  it('空串或非法输入返回空串', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('not-a-date')).toBe('');
    // @ts-expect-error 故意传非字符串验证健壮性
    expect(formatDateTime(undefined)).toBe('');
  });
});

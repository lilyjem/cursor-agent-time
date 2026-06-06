import { describe, it, expect } from 'vitest';
import { formatDuration } from '../src/format';

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

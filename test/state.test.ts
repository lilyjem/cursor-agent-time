import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readState } from '../src/state';

let dir: string;
let file: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-'));
  file = path.join(dir, 'state.json');
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('readState', () => {
  it('文件不存在返回 null', () => {
    expect(readState(file)).toBeNull();
  });
  it('损坏 JSON 返回 null', () => {
    fs.writeFileSync(file, '{ broken');
    expect(readState(file)).toBeNull();
  });
  it('缺少 durationMs 返回 null', () => {
    fs.writeFileSync(file, JSON.stringify({ status: 'completed' }));
    expect(readState(file)).toBeNull();
  });
  it('合法内容返回结构化对象', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({
        durationMs: 42000,
        status: 'completed',
        startedAt: '2026-06-06T00:00:00.000Z',
        endedAt: '2026-06-06T00:00:42.000Z',
        conversationId: 'c',
      })
    );
    expect(readState(file)).toEqual({
      durationMs: 42000,
      status: 'completed',
      startedAt: '2026-06-06T00:00:00.000Z',
      endedAt: '2026-06-06T00:00:42.000Z',
      conversationId: 'c',
    });
  });
  it('旧数据缺 startedAt 时回退空串', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({ durationMs: 42000, status: 'completed', endedAt: '2026-06-06T00:00:42.000Z', conversationId: 'c' })
    );
    expect(readState(file)?.startedAt).toBe('');
  });
  it('startedAt 非字符串时回退空串', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({ durationMs: 42000, status: 'completed', startedAt: 123, endedAt: '2026-06-06T00:00:42.000Z', conversationId: 'c' })
    );
    expect(readState(file)?.startedAt).toBe('');
  });
});

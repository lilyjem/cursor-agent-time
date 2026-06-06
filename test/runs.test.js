// vitest 已开启 globals，describe/it/expect/beforeEach/afterEach 为全局，无需 require('vitest')
const fs = require('fs');
const os = require('os');
const path = require('path');
const { recordStart, recordStop, statePath, runsPath } = require('../hooks/lib/runs');
const { readJson } = require('../hooks/lib/store');

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runs-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('runs', () => {
  it('start 后 stop 写出正确耗时并清理开始记录', () => {
    recordStart(dir, 'conv-1', 1000);
    const wrote = recordStop(dir, 'conv-1', 'completed', 43000);
    expect(wrote).toBe(true);
    const state = readJson(statePath(dir), null);
    expect(state.durationMs).toBe(42000);
    expect(state.status).toBe('completed');
    expect(state.conversationId).toBe('conv-1');
    const runs = readJson(runsPath(dir), { starts: {} });
    expect(runs.starts['conv-1']).toBeUndefined();
  });
  it('找不到 start 时跳过写入', () => {
    const wrote = recordStop(dir, 'ghost', 'completed', 5000);
    expect(wrote).toBe(false);
    expect(readJson(statePath(dir), null)).toBe(null);
  });
  it('保留 aborted/error 状态', () => {
    recordStart(dir, 'c2', 0);
    recordStop(dir, 'c2', 'aborted', 1000);
    expect(readJson(statePath(dir), null).status).toBe('aborted');
  });
  it('多个会话互不串台', () => {
    recordStart(dir, 'a', 0);
    recordStart(dir, 'b', 0);
    recordStop(dir, 'a', 'completed', 1000);
    const runs = readJson(runsPath(dir), { starts: {} });
    expect(runs.starts['b']).toBe(0);
    expect(runs.starts['a']).toBeUndefined();
  });
});

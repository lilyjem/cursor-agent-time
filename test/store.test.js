// vitest 已开启 globals，describe/it/expect/beforeEach/afterEach 为全局，无需 require('vitest')
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJson, writeJsonAtomic } = require('../hooks/lib/store');

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('store', () => {
  it('读取不存在的文件返回 fallback', () => {
    const r = readJson(path.join(dir, 'nope.json'), { a: 1 });
    expect(r).toEqual({ a: 1 });
  });
  it('读取损坏 JSON 返回 fallback', () => {
    const p = path.join(dir, 'bad.json');
    fs.writeFileSync(p, '{ not json');
    expect(readJson(p, null)).toBe(null);
  });
  it('写入后能读回（往返一致）', () => {
    const p = path.join(dir, 'x.json');
    writeJsonAtomic(p, { hello: 'world', n: 2 });
    expect(readJson(p, null)).toEqual({ hello: 'world', n: 2 });
  });
  it('写入时自动创建多级目录', () => {
    const p = path.join(dir, 'deep', 'nested', 'y.json');
    writeJsonAtomic(p, { ok: true });
    expect(readJson(p, null)).toEqual({ ok: true });
  });
});

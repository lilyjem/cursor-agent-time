// 回归测试：复刻 Cursor(Windows) 给 hook stdin 加 UTF-8 BOM 的真实场景，
// 直接 spawn 真实的 start.js，断言它仍能把开始时间写入 runs.json。
// 这能防止「parseHookInput 被解开接线」之类的回归。
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let tmpHome;
beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agenttime-home-'));
});
afterEach(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

describe('start.js 端到端处理 BOM stdin', () => {
  it('收到带 UTF-8 BOM 的 stdin 仍写入 runs.json', () => {
    const startScript = path.join(__dirname, '..', 'hooks', 'start.js');
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from(JSON.stringify({ conversation_id: 'e2e-bom' }), 'utf8');
    const res = spawnSync(process.execPath, [startScript], {
      input: Buffer.concat([bom, body]),
      // start.js 用 os.homedir()，Windows 取 USERPROFILE；隔离到临时目录
      env: { ...process.env, USERPROFILE: tmpHome, HOME: tmpHome },
    });
    expect(res.status).toBe(0);

    const runsFile = path.join(tmpHome, '.cursor', 'agent-time', 'runs.json');
    expect(fs.existsSync(runsFile)).toBe(true);
    const runs = JSON.parse(fs.readFileSync(runsFile, 'utf8'));
    expect(typeof runs.starts['e2e-bom']).toBe('number');
  });
});

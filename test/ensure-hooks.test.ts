import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureHooksInstalled } from '../src/install-hooks';

let home: string;
let extHooks: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  extHooks = fs.mkdtempSync(path.join(os.tmpdir(), 'exthooks-'));
  fs.mkdirSync(path.join(extHooks, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(extHooks, 'start.js'), '// start');
  fs.writeFileSync(path.join(extHooks, 'stop.js'), '// stop');
  fs.writeFileSync(path.join(extHooks, 'lib', 'runs.js'), '// runs');
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(extHooks, { recursive: true, force: true });
});

describe('ensureHooksInstalled', () => {
  it('复制脚本并写入绝对路径命令的 hooks.json', () => {
    ensureHooksInstalled(home, extHooks);
    expect(fs.existsSync(path.join(home, '.cursor', 'hooks', 'agent-time', 'start.js'))).toBe(true);
    expect(fs.existsSync(path.join(home, '.cursor', 'hooks', 'agent-time', 'lib', 'runs.js'))).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.cursor', 'hooks.json'), 'utf8'));
    const startCmd: string = cfg.hooks.beforeSubmitPrompt[0].command;
    expect(startCmd).toContain('agent-time/start.js');
    const bare = startCmd.replace(/^node "/, '').replace(/"$/, '');
    expect(path.isAbsolute(bare)).toBe(true);
  });
  it('二次调用幂等（不重复添加条目）', () => {
    ensureHooksInstalled(home, extHooks);
    ensureHooksInstalled(home, extHooks);
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.cursor', 'hooks.json'), 'utf8'));
    expect(cfg.hooks.beforeSubmitPrompt).toHaveLength(1);
    expect(cfg.hooks.stop).toHaveLength(1);
  });
  it('保留用户已有的 hooks.json 内容', () => {
    const cursorDir = path.join(home, '.cursor');
    fs.mkdirSync(cursorDir, { recursive: true });
    fs.writeFileSync(
      path.join(cursorDir, 'hooks.json'),
      JSON.stringify({ version: 1, hooks: { afterFileEdit: [{ command: './x.sh' }] } })
    );
    ensureHooksInstalled(home, extHooks);
    const cfg = JSON.parse(fs.readFileSync(path.join(cursorDir, 'hooks.json'), 'utf8'));
    expect(cfg.hooks.afterFileEdit[0].command).toBe('./x.sh');
    expect(cfg.hooks.beforeSubmitPrompt[0].command).toContain('start.js');
  });
});

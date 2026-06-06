import * as fs from 'fs';
import * as path from 'path';

const START_CMD = 'node ./hooks/agent-time/start.js';
const STOP_CMD = 'node ./hooks/agent-time/stop.js';
const START_MARK = 'hooks/agent-time/start.js';
const STOP_MARK = 'hooks/agent-time/stop.js';

// 在某事件数组里幂等确保存在我们的条目；返回是否发生变更
function ensureEntry(hooks: any, event: string, mark: string, command: string): boolean {
  const arr = Array.isArray(hooks[event]) ? hooks[event] : [];
  const exists = arr.some(
    (e: any) => e && typeof e.command === 'string' && e.command.includes(mark)
  );
  hooks[event] = arr;
  if (exists) {
    return false;
  }
  arr.push({ command });
  return true;
}

// 纯函数：把本插件的 hook 条目幂等合并进现有配置
export function mergeHooksConfig(existing: any): { config: any; changed: boolean } {
  const config = existing && typeof existing === 'object' ? existing : {};
  if (typeof config.version !== 'number') {
    config.version = 1;
  }
  if (!config.hooks || typeof config.hooks !== 'object') {
    config.hooks = {};
  }
  let changed = false;
  changed = ensureEntry(config.hooks, 'beforeSubmitPrompt', START_MARK, START_CMD) || changed;
  changed = ensureEntry(config.hooks, 'stop', STOP_MARK, STOP_CMD) || changed;
  return { config, changed };
}

// 递归复制目录（把扩展自带的 hooks/ 复制到 ~/.cursor/hooks/agent-time/）
function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// 副作用入口：复制脚本 + 幂等写 hooks.json
export function ensureHooksInstalled(homeDir: string, extHooksDir: string): void {
  const targetDir = path.join(homeDir, '.cursor', 'hooks', 'agent-time');
  copyDir(extHooksDir, targetDir);

  const hooksJsonPath = path.join(homeDir, '.cursor', 'hooks.json');
  let existing: any = {};
  try {
    existing = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
  } catch {
    existing = {};
  }
  const { config, changed } = mergeHooksConfig(existing);
  if (changed) {
    fs.mkdirSync(path.dirname(hooksJsonPath), { recursive: true });
    fs.writeFileSync(hooksJsonPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

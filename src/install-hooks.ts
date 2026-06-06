import * as fs from 'fs';
import * as path from 'path';

// 把路径统一成正斜杠：Windows 下 node 也能识别，且避免 JSON 里转义反斜杠
function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

// 根据 home 目录算出两个 hook 脚本的绝对命令（用引号包裹以兼容含空格的路径）
function buildCommands(homeDir: string): { startCmd: string; stopCmd: string } {
  const startPath = toPosix(path.join(homeDir, '.cursor', 'hooks', 'agent-time', 'start.js'));
  const stopPath = toPosix(path.join(homeDir, '.cursor', 'hooks', 'agent-time', 'stop.js'));
  return {
    startCmd: `node "${startPath}"`,
    stopCmd: `node "${stopPath}"`,
  };
}

// 判断某事件数组里是否已存在指向给定脚本文件名的本插件条目（路径分隔符无关）
function hasEntry(arr: any[], fileMark: string): boolean {
  return arr.some(
    (e) =>
      e &&
      typeof e.command === 'string' &&
      e.command.includes('agent-time') &&
      e.command.includes(fileMark)
  );
}

// 在某事件数组里幂等确保存在本插件条目；返回是否变更。不修改原数组。
function ensureEntry(hooks: any, event: string, fileMark: string, command: string): boolean {
  const arr = Array.isArray(hooks[event]) ? [...hooks[event]] : [];
  hooks[event] = arr;
  if (hasEntry(arr, fileMark)) {
    return false;
  }
  // timeout 兜底：即使脚本异常，也不会长时间拖住 agent
  arr.push({ command, timeout: 5 });
  return true;
}

// 纯函数：把本插件的 hook 条目幂等合并进现有配置（不就地修改入参）
export function mergeHooksConfig(
  existing: any,
  commands: { startCmd: string; stopCmd: string }
): { config: any; changed: boolean } {
  const src = existing && typeof existing === 'object' ? existing : {};
  // 浅拷贝顶层与 hooks，避免改动调用方传入的对象
  const config: any = { ...src };
  config.version = typeof config.version === 'number' ? config.version : 1;
  config.hooks =
    config.hooks && typeof config.hooks === 'object' ? { ...config.hooks } : {};

  let changed = false;
  changed = ensureEntry(config.hooks, 'beforeSubmitPrompt', 'start.js', commands.startCmd) || changed;
  changed = ensureEntry(config.hooks, 'stop', 'stop.js', commands.stopCmd) || changed;
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

// 副作用入口：复制脚本 + 幂等写 hooks.json（命令用绝对路径，免疫 cwd 变化）
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
  const { config, changed } = mergeHooksConfig(existing, buildCommands(homeDir));
  if (changed) {
    fs.mkdirSync(path.dirname(hooksJsonPath), { recursive: true });
    fs.writeFileSync(hooksJsonPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

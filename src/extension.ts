import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { formatDuration } from './format';
import { readState } from './state';
import { ensureHooksInstalled } from './install-hooks';

const DATA_DIR = path.join(os.homedir(), '.cursor', 'agent-time');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

let statusItem: vscode.StatusBarItem;
let watcher: fs.FSWatcher | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // 1) 幂等自动配置 hooks（可由设置关闭）
  const auto = vscode.workspace
    .getConfiguration('agentTime')
    .get<boolean>('autoManageHooks', true);
  if (auto) {
    try {
      ensureHooksInstalled(os.homedir(), path.join(context.extensionPath, 'hooks'));
    } catch (err) {
      console.error('[agent-time] 自动配置 hooks 失败', err);
    }
  }

  // 2) 状态栏项
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusItem);
  render();
  statusItem.show();

  // 3) 监听 state.json（监听目录以兼容原子 rename）
  startWatching();
  context.subscriptions.push({ dispose: stopWatching });
}

function render(): void {
  const state = readState(STATE_FILE);
  if (!state) {
    statusItem.text = '$(clock) --';
    statusItem.tooltip = 'Agent 运行耗时：暂无数据';
    return;
  }
  statusItem.text = `$(clock) ${formatDuration(state.durationMs)}`;
  const ended = state.endedAt ? new Date(state.endedAt).toLocaleTimeString() : '';
  statusItem.tooltip =
    `上一轮 agent 耗时 ${formatDuration(state.durationMs)}\n` +
    `结束于 ${ended}\n状态：${state.status}`;
}

function startWatching(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    watcher = fs.watch(DATA_DIR, (_event, filename) => {
      if (!filename || filename === 'state.json') {
        render();
      }
    });
  } catch {
    // 监听失败则回退到轮询
    const timer = setInterval(render, 2000);
    watcher = { close: () => clearInterval(timer) } as unknown as fs.FSWatcher;
  }
}

function stopWatching(): void {
  try {
    watcher?.close();
  } catch {
    /* ignore */
  }
  watcher = undefined;
}

export function deactivate(): void {
  stopWatching();
}

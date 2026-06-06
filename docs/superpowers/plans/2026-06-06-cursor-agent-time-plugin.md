# Cursor Agent 运行耗时插件 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Cursor 底部状态栏常驻显示最近一轮 agent 运行耗时（如 `⏱ 42s`）。

**Architecture:** 两个解耦组件，通过 `~/.cursor/agent-time/state.json` 单向通信。计时端是两个 Node hook 脚本（`beforeSubmitPrompt` 记开始、`stop` 算耗时并写文件）；显示端是一个 Cursor 扩展，监听该文件并渲染状态栏，激活时还会幂等地把 hooks 写进 `~/.cursor/hooks.json`。

**Tech Stack:** TypeScript（扩展，tsc 编译到 `out/`）、纯 CommonJS Node 脚本（hooks）、vitest（单测）、@vscode/vsce（打包）。

**平台前提：** Windows（PowerShell）。所有 `git commit` 用单行 `-m`，不要用 heredoc。Cursor ≥ 1.7、`node` 在 PATH 上。

---

## 文件结构

```
cursor-time/
├─ package.json            扩展清单 + 开发依赖与脚本
├─ tsconfig.json           TS 编译配置
├─ vitest.config.ts        测试配置
├─ .vscodeignore           打包 vsix 时的排除项（确保 hooks/ 与 out/ 进包）
├─ src/
│  ├─ extension.ts         激活、状态栏、文件监听、调用自动配置
│  ├─ format.ts            时长格式化（纯函数）
│  ├─ state.ts             读取并校验 state.json（纯函数）
│  └─ install-hooks.ts     幂等合并 hooks.json + 复制脚本
├─ hooks/
│  ├─ start.js             beforeSubmitPrompt 入口（stdin 包装）
│  ├─ stop.js              stop 入口（stdin 包装）
│  └─ lib/
│     ├─ stdin.js          读取 stdin（DRY）
│     ├─ store.js          原子 JSON 读写
│     └─ runs.js           recordStart / recordStop
├─ test/
│  ├─ store.test.js        store.js 单测
│  ├─ runs.test.js         runs.js 单测
│  ├─ format.test.ts       format.ts 单测
│  ├─ state.test.ts        state.ts 单测
│  └─ install-hooks.test.ts install-hooks 合并逻辑单测
├─ docs/superpowers/...    设计文档与本计划
└─ README.md
```

数据文件（运行期由 hooks 生成，不入库）：`~/.cursor/agent-time/runs.json`、`~/.cursor/agent-time/state.json`。

---

## Task 1: 项目脚手架与工具链

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.vscodeignore`
- Create: `README.md`

- [ ] **Step 1: 写 `package.json`**

```json
{
  "name": "cursor-agent-time",
  "displayName": "Agent Time",
  "description": "在状态栏显示最近一轮 Cursor Agent 运行耗时",
  "version": "0.0.1",
  "publisher": "local",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "Agent Time",
      "properties": {
        "agentTime.autoManageHooks": {
          "type": "boolean",
          "default": true,
          "description": "激活时自动配置 ~/.cursor/hooks.json 中的计时 hooks"
        }
      }
    }
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "vitest run",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/vscode": "^1.85.0",
    "typescript": "^5",
    "vitest": "^2",
    "@vscode/vsce": "^3"
  }
}
```

- [ ] **Step 2: 写 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "rootDir": "src",
    "lib": ["ES2020"],
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "test"]
}
```

- [ ] **Step 3: 写 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,js}'],
    environment: 'node',
    // 开启全局 API，避免在 CommonJS 的 .js 测试里 require('vitest')（vitest 是 ESM，会报错）
    globals: true,
  },
});
```

- [ ] **Step 4: 写 `.vscodeignore`**（确保 `hooks/` 与 `out/` 进包，排除源码与测试）

```
.vscode/**
test/**
src/**
docs/**
**/*.ts
**/*.map
tsconfig.json
vitest.config.ts
.gitignore
.git/**
node_modules/**
```

- [ ] **Step 5: 写 `README.md`（骨架）**

```markdown
# Agent Time

在 Cursor 底部状态栏显示最近一轮 agent 运行耗时（如 `⏱ 42s`）。

## 工作原理
- Cursor Hooks（`beforeSubmitPrompt` + `stop`）精确计时，写入 `~/.cursor/agent-time/state.json`。
- 本扩展监听该文件并渲染状态栏；激活时自动幂等配置 `~/.cursor/hooks.json`。

## 前提
- Cursor ≥ 1.7、`node` 在 PATH 上、Windows/macOS/Linux 均可。

## 安装
见底部「构建与安装」。
```

- [ ] **Step 6: 安装依赖**

Run: `npm install`
Expected: 成功生成 `node_modules/` 与 `package-lock.json`，无报错。

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .vscodeignore README.md package-lock.json
git commit -m "chore: 初始化扩展脚手架与工具链"
```

---

## Task 2: 时长格式化 `format.ts`（TDD）

**Files:**
- Create: `src/format.ts`
- Test: `test/format.test.ts`

- [ ] **Step 1: 写失败测试 `test/format.test.ts`**

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/format.test.ts`
Expected: FAIL，提示 `formatDuration` 未定义 / 找不到模块 `../src/format`。

- [ ] **Step 3: 写最小实现 `src/format.ts`**

```ts
// 把毫秒时长格式化为人类可读字符串：<60s -> "42s"；<1h -> "1m23s"；否则 "1h2m"
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '--';
  }
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) {
    return `${totalMin}m${sec}s`;
  }
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${hours}h${min}m`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/format.test.ts`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add src/format.ts test/format.test.ts
git commit -m "feat: 新增时长格式化函数 formatDuration"
```

---

## Task 3: 原子 JSON 读写 `hooks/lib/store.js`（TDD）

**Files:**
- Create: `hooks/lib/store.js`
- Test: `test/store.test.js`

- [ ] **Step 1: 写失败测试 `test/store.test.js`**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/store.test.js`
Expected: FAIL，找不到模块 `../hooks/lib/store`。

- [ ] **Step 3: 写最小实现 `hooks/lib/store.js`**

```js
// 原子 JSON 读写：读失败当作 fallback；写用「临时文件 + rename」避免并发损坏
const fs = require('fs');
const path = require('path');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

module.exports = { readJson, writeJsonAtomic };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/store.test.js`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add hooks/lib/store.js test/store.test.js
git commit -m "feat: 新增原子 JSON 读写工具 store.js"
```

---

## Task 4: 计时核心 `hooks/lib/runs.js`（TDD）

**Files:**
- Create: `hooks/lib/runs.js`
- Test: `test/runs.test.js`

- [ ] **Step 1: 写失败测试 `test/runs.test.js`**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/runs.test.js`
Expected: FAIL，找不到模块 `../hooks/lib/runs`。

- [ ] **Step 3: 写最小实现 `hooks/lib/runs.js`**

```js
// 计时核心：记录每个会话的开始时间；结束时计算耗时并写入 state.json
const path = require('path');
const { readJson, writeJsonAtomic } = require('./store');

function runsPath(dataDir) {
  return path.join(dataDir, 'runs.json');
}
function statePath(dataDir) {
  return path.join(dataDir, 'state.json');
}

// 记录某会话的本轮开始时间
function recordStart(dataDir, conversationId, nowMs) {
  const runs = readJson(runsPath(dataDir), { version: 1, starts: {} });
  if (!runs.starts || typeof runs.starts !== 'object') {
    runs.starts = {};
  }
  runs.starts[conversationId] = nowMs;
  writeJsonAtomic(runsPath(dataDir), runs);
}

// 结束某会话本轮：找到开始时间则写 state 并清理，返回是否写出
function recordStop(dataDir, conversationId, status, nowMs) {
  const runs = readJson(runsPath(dataDir), { version: 1, starts: {} });
  const start = runs.starts ? runs.starts[conversationId] : undefined;
  if (typeof start !== 'number') {
    return false;
  }
  const durationMs = Math.max(0, nowMs - start);
  writeJsonAtomic(statePath(dataDir), {
    version: 1,
    durationMs,
    status,
    endedAt: new Date(nowMs).toISOString(),
    conversationId,
  });
  delete runs.starts[conversationId];
  writeJsonAtomic(runsPath(dataDir), runs);
  return true;
}

module.exports = { recordStart, recordStop, runsPath, statePath };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/runs.test.js`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add hooks/lib/runs.js test/runs.test.js
git commit -m "feat: 新增计时核心 runs.js（recordStart/recordStop）"
```

---

## Task 5: hook 入口脚本 `start.js` / `stop.js`（集成验证）

**Files:**
- Create: `hooks/lib/stdin.js`
- Create: `hooks/start.js`
- Create: `hooks/stop.js`

- [ ] **Step 1: 写 `hooks/lib/stdin.js`（DRY 读取 stdin）**

```js
// 读取全部 stdin 文本（hook 通过 stdin 收到 JSON）
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    // 无 stdin（极端情况）时不至于卡死
    process.stdin.on('error', () => resolve(data));
  });
}

module.exports = { readStdin };
```

- [ ] **Step 2: 写 `hooks/start.js`（beforeSubmitPrompt 入口）**

```js
#!/usr/bin/env node
// beforeSubmitPrompt hook：记录本轮 agent 开始时间。任何异常都不阻断提交。
const os = require('os');
const path = require('path');
const { readStdin } = require('./lib/stdin');
const { recordStart } = require('./lib/runs');

const DATA_DIR = path.join(os.homedir(), '.cursor', 'agent-time');

(async () => {
  try {
    const input = JSON.parse((await readStdin()) || '{}');
    if (input.conversation_id) {
      recordStart(DATA_DIR, input.conversation_id, Date.now());
    }
  } catch {
    // 计时失败不能影响 agent，吞掉异常
  }
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
})();
```

- [ ] **Step 3: 写 `hooks/stop.js`（stop 入口）**

```js
#!/usr/bin/env node
// stop hook：计算并写入本轮耗时。绝不返回 followup_message（不让 agent 多跑）。
const os = require('os');
const path = require('path');
const { readStdin } = require('./lib/stdin');
const { recordStop } = require('./lib/runs');

const DATA_DIR = path.join(os.homedir(), '.cursor', 'agent-time');

(async () => {
  try {
    const input = JSON.parse((await readStdin()) || '{}');
    if (input.conversation_id) {
      recordStop(DATA_DIR, input.conversation_id, input.status || 'completed', Date.now());
    }
  } catch {
    // 忽略，绝不阻断
  }
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
})();
```

- [ ] **Step 4: 手动集成验证（PowerShell 管道喂 JSON）**

Run（依次执行）：
```powershell
'{"conversation_id":"itest"}' | node hooks/start.js
'{"conversation_id":"itest","status":"completed"}' | node hooks/stop.js
node -e "console.log(require('fs').readFileSync(require('path').join(require('os').homedir(),'.cursor','agent-time','state.json'),'utf8'))"
```
Expected:
- `start.js` 输出 `{"continue":true}`。
- `stop.js` 输出 `{}`。
- 最后打印出的 `state.json` 含 `"durationMs"`（一个很小的毫秒数）、`"status":"completed"`、`"conversationId":"itest"`。

- [ ] **Step 5: Commit**

```bash
git add hooks/lib/stdin.js hooks/start.js hooks/stop.js
git commit -m "feat: 新增 start/stop hook 入口脚本"
```

---

## Task 6: 读取 state.json `src/state.ts`（TDD）

**Files:**
- Create: `src/state.ts`
- Test: `test/state.test.ts`

- [ ] **Step 1: 写失败测试 `test/state.test.ts`**

```ts
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
      JSON.stringify({ durationMs: 42000, status: 'completed', endedAt: '2026-06-06T00:00:00.000Z', conversationId: 'c' })
    );
    expect(readState(file)).toEqual({
      durationMs: 42000,
      status: 'completed',
      endedAt: '2026-06-06T00:00:00.000Z',
      conversationId: 'c',
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.ts`
Expected: FAIL，找不到模块 `../src/state`。

- [ ] **Step 3: 写最小实现 `src/state.ts`**

```ts
import * as fs from 'fs';

// 状态栏需要的最近一轮运行结果
export interface RunState {
  durationMs: number;
  status: string;
  endedAt: string;
  conversationId: string;
}

// 读取并校验 state.json；缺失/损坏/字段非法时返回 null
export function readState(filePath: string): RunState | null {
  try {
    const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (typeof obj.durationMs !== 'number') {
      return null;
    }
    return {
      durationMs: obj.durationMs,
      status: typeof obj.status === 'string' ? obj.status : 'completed',
      endedAt: typeof obj.endedAt === 'string' ? obj.endedAt : '',
      conversationId: typeof obj.conversationId === 'string' ? obj.conversationId : '',
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.ts`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add src/state.ts test/state.test.ts
git commit -m "feat: 新增 state.json 读取与校验 readState"
```

---

## Task 7: 幂等配置 hooks `src/install-hooks.ts`（TDD）

**Files:**
- Create: `src/install-hooks.ts`
- Test: `test/install-hooks.test.ts`

- [ ] **Step 1: 写失败测试 `test/install-hooks.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mergeHooksConfig } from '../src/install-hooks';

describe('mergeHooksConfig', () => {
  it('空配置会加上两个 hook 并标记已变更', () => {
    const { config, changed } = mergeHooksConfig({});
    expect(changed).toBe(true);
    expect(config.version).toBe(1);
    expect(config.hooks.beforeSubmitPrompt[0].command).toContain('hooks/agent-time/start.js');
    expect(config.hooks.stop[0].command).toContain('hooks/agent-time/stop.js');
  });
  it('保留用户已有的其它 hook', () => {
    const existing = { version: 1, hooks: { afterFileEdit: [{ command: './format.sh' }] } };
    const { config } = mergeHooksConfig(existing);
    expect(config.hooks.afterFileEdit[0].command).toBe('./format.sh');
    expect(config.hooks.beforeSubmitPrompt[0].command).toContain('start.js');
  });
  it('已安装则幂等（changed 为 false，不重复添加）', () => {
    const once = mergeHooksConfig({}).config;
    const { changed, config } = mergeHooksConfig(once);
    expect(changed).toBe(false);
    expect(config.hooks.beforeSubmitPrompt).toHaveLength(1);
    expect(config.hooks.stop).toHaveLength(1);
  });
  it('保留同一事件下用户已有的别的条目', () => {
    const existing = { hooks: { stop: [{ command: './my-stop.sh' }] } };
    const { config } = mergeHooksConfig(existing);
    expect(config.hooks.stop).toHaveLength(2);
    expect(config.hooks.stop[0].command).toBe('./my-stop.sh');
    expect(config.hooks.stop[1].command).toContain('stop.js');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/install-hooks.test.ts`
Expected: FAIL，找不到模块 `../src/install-hooks`。

- [ ] **Step 3: 写最小实现 `src/install-hooks.ts`**

```ts
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/install-hooks.test.ts`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: Commit**

```bash
git add src/install-hooks.ts test/install-hooks.test.ts
git commit -m "feat: 新增 hooks.json 幂等合并与脚本复制 install-hooks"
```

---

## Task 8: 扩展入口 `src/extension.ts`（编译验证 + 手动 e2e）

**Files:**
- Create: `src/extension.ts`

- [ ] **Step 1: 写 `src/extension.ts`**

```ts
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
```

- [ ] **Step 2: 编译确认无类型错误**

Run: `npm run compile`
Expected: 成功生成 `out/extension.js`、`out/format.js`、`out/state.js`、`out/install-hooks.js`，无 TS 报错。

- [ ] **Step 3: 跑全部单测确认未回归**

Run: `npx vitest run`
Expected: 所有测试 PASS（format / store / runs / state / install-hooks）。

- [ ] **Step 4: Commit**

```bash
git add src/extension.ts
git commit -m "feat: 新增扩展入口（状态栏 + 文件监听 + 自动配置 hooks）"
```

---

## Task 9: 打包 vsix + 端到端手测 + README 收尾

**Files:**
- Modify: `README.md`（补充构建与安装、使用说明）

- [ ] **Step 1: 打包 vsix**

Run: `npm run package`
Expected: 生成 `cursor-agent-time-0.0.1.vsix`；vsce 输出的文件清单中**包含 `hooks/` 下的脚本与 `out/` 下的 js**（不含 `src/`、`test/`、`docs/`）。

- [ ] **Step 2: 安装到 Cursor**

Run: `cursor --install-extension cursor-agent-time-0.0.1.vsix`
（若 `cursor` CLI 不可用：Cursor 命令面板 → “Extensions: Install from VSIX…” 选该文件）
Expected: 提示安装成功；重载窗口后扩展生效。

- [ ] **Step 3: 验证自动配置生效**

Run:
```powershell
node -e "console.log(require('fs').readFileSync(require('path').join(require('os').homedir(),'.cursor','hooks.json'),'utf8'))"
```
Expected: `hooks.json` 中含 `beforeSubmitPrompt` 指向 `start.js`、`stop` 指向 `stop.js`；`~/.cursor/hooks/agent-time/` 下存在 `start.js`、`stop.js`、`lib/*`。

- [ ] **Step 4: 端到端手测**

操作：在 Cursor 里随便发一条消息给 agent，等它本轮结束。
Expected: 重载/触发后，底部状态栏出现 `⏱ <耗时>`（如 `⏱ 8s`）；鼠标悬停显示结束时间与状态。再发一条消息，结束后数字随之更新。

> 排查：Cursor 设置里有 “Hooks” 标签可查看 hook 是否被触发；若状态栏不更新，确认 `node` 在 PATH、`~/.cursor/agent-time/state.json` 是否在更新。

- [ ] **Step 5: 完善 `README.md`**（在骨架基础上追加）

```markdown
## 构建与安装
1. `npm install`
2. `npm run compile`
3. `npm run package` 生成 `.vsix`
4. `cursor --install-extension cursor-agent-time-0.0.1.vsix`（或命令面板 Install from VSIX）

安装后扩展会自动把计时 hooks 写入 `~/.cursor/hooks.json`（可在设置 `agentTime.autoManageHooks` 关闭）。

## 使用
发消息给 agent，本轮结束后状态栏显示 `⏱ 最近一轮耗时`。

## 卸载
卸载扩展后，可手动从 `~/.cursor/hooks.json` 删除 `agent-time` 相关条目，并删除 `~/.cursor/hooks/agent-time/` 与 `~/.cursor/agent-time/`。
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: 补充构建安装与使用说明，完成端到端验证"
```

---

## 验证清单（全部完成后）

- [ ] `npx vitest run` 全绿（format / store / runs / state / install-hooks）。
- [ ] `npm run compile` 无类型错误。
- [ ] `npm run package` 产出的 vsix 含 `hooks/` 与 `out/`。
- [ ] 安装后 `~/.cursor/hooks.json` 正确合并、脚本已复制。
- [ ] 真实跑一轮 agent，状态栏显示并更新耗时。

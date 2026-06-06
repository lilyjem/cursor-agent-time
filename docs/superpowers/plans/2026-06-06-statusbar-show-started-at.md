# 状态栏增加"本轮开始时间" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在状态栏 tooltip 增加一行"开始于 <完整日期时间>"，并把"结束于"统一为同样的完整日期时间格式。

**Architecture:** 沿用现有双进程架构——hook 端 `stop.js`→`recordStop` 写 `state.json` 时补 `startedAt`（ISO 字符串）；扩展端 `readState` 读出该字段（兼容旧数据缺字段），新增纯函数 `formatDateTime` 把 ISO 转成本地 `YYYY-MM-DD HH:mm:ss`，`render()` 据此渲染 tooltip。

**Tech Stack:** TypeScript（扩展端 `src/`，编译到 `out/`）、CommonJS（hook 端 `hooks/`）、Vitest 单元测试。

**关联设计文档：** `docs/superpowers/specs/2026-06-06-statusbar-show-started-at-design.md`

---

## File Structure

- `src/format.ts`（修改）：新增纯函数 `formatDateTime(iso)`，与既有 `formatDuration` 并列。
- `test/format.test.ts`（修改）：新增 `formatDateTime` 的用例。
- `hooks/lib/runs.js`（修改）：`recordStop` 写 `state.json` 时增加 `startedAt`。
- `test/runs.test.js`（修改）：断言 `state.json` 含正确 `startedAt`。
- `src/state.ts`（修改）：`RunState` 接口与 `readState` 增加 `startedAt`（缺失回退空串）。
- `test/state.test.ts`（修改）：更新结构化断言并新增"缺字段回退"用例。
- `src/extension.ts`（修改）：`render()` 在 tooltip 增加"开始于"行、统一"结束于"格式。

**测试时区注意（贯穿全计划）：** `formatDateTime` 取本地时区分量。为让断言与运行机器时区无关，测试输入一律用 `new Date(年, 月-1, 日, 时, 分, 秒)`（本地时间构造）再 `.toISOString()` 得到，期望值就是对应的本地各段。这样构造与格式化都走本地时区，结果恒定。

---

## Task 1: `formatDateTime` 纯函数

**Files:**
- Modify: `src/format.ts`
- Test: `test/format.test.ts`

- [ ] **Step 1: 写失败测试**

在 `test/format.test.ts` 末尾、最后一个 `});`（`describe('formatDuration', ...)` 的收尾）之后追加新 describe 块，并在文件顶部把导入改为同时引入 `formatDateTime`：

把第 2 行
```ts
import { formatDuration } from '../src/format';
```
改为
```ts
import { formatDuration, formatDateTime } from '../src/format';
```

在文件末尾追加：
```ts
describe('formatDateTime', () => {
  it('正常 ISO 转为本地 YYYY-MM-DD HH:mm:ss', () => {
    const d = new Date(2026, 5, 6, 16, 22, 1); // 本地 2026-06-06 16:22:01
    expect(formatDateTime(d.toISOString())).toBe('2026-06-06 16:22:01');
  });
  it('月日时分秒按需补零', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5); // 本地 2026-01-02 03:04:05
    expect(formatDateTime(d.toISOString())).toBe('2026-01-02 03:04:05');
  });
  it('空串或非法输入返回空串', () => {
    expect(formatDateTime('')).toBe('');
    expect(formatDateTime('not-a-date')).toBe('');
    // @ts-expect-error 故意传非字符串验证健壮性
    expect(formatDateTime(undefined)).toBe('');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/format.test.ts`
Expected: FAIL，报错类似 `formatDateTime is not a function` / 导入不存在。

- [ ] **Step 3: 写最小实现**

在 `src/format.ts` 末尾追加：
```ts
// 把 ISO 时间字符串格式化为本地时区的 "YYYY-MM-DD HH:mm:ss"；
// 空串/非字符串/无法解析一律返回空串，由调用方决定是否展示。
export function formatDateTime(iso: string): string {
  if (typeof iso !== 'string' || iso === '') {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const pad = (n: number): string => String(n).padStart(2, '0');
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/format.test.ts`
Expected: PASS（formatDuration 与 formatDateTime 全部通过）。

- [ ] **Step 5: 提交**

```bash
git add src/format.ts test/format.test.ts
git commit -m "feat: 新增 formatDateTime 本地完整日期时间格式化"
```

---

## Task 2: `recordStop` 写入 `startedAt`

**Files:**
- Modify: `hooks/lib/runs.js`
- Test: `test/runs.test.js`

- [ ] **Step 1: 写失败测试**

在 `test/runs.test.js` 的 `'start 后 stop 写出正确耗时并清理开始记录'` 用例里，
在 `expect(state.conversationId).toBe('conv-1');` 之后插入一行断言：
```js
    expect(state.startedAt).toBe(new Date(1000).toISOString());
```

该用例改后完整形如：
```js
  it('start 后 stop 写出正确耗时并清理开始记录', () => {
    recordStart(dir, 'conv-1', 1000);
    const wrote = recordStop(dir, 'conv-1', 'completed', 43000);
    expect(wrote).toBe(true);
    const state = readJson(statePath(dir), null);
    expect(state.durationMs).toBe(42000);
    expect(state.status).toBe('completed');
    expect(state.conversationId).toBe('conv-1');
    expect(state.startedAt).toBe(new Date(1000).toISOString());
    const runs = readJson(runsPath(dir), { starts: {} });
    expect(runs.starts['conv-1']).toBeUndefined();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/runs.test.js`
Expected: FAIL，`state.startedAt` 为 `undefined`，断言不等。

- [ ] **Step 3: 写最小实现**

在 `hooks/lib/runs.js` 的 `recordStop` 中，给写入 `state.json` 的对象增加 `startedAt`。
把现有写入块：
```js
  writeJsonAtomic(statePath(dataDir), {
    version: 1,
    durationMs,
    status,
    endedAt: new Date(nowMs).toISOString(),
    conversationId,
  });
```
改为：
```js
  writeJsonAtomic(statePath(dataDir), {
    version: 1,
    durationMs,
    status,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(nowMs).toISOString(),
    conversationId,
  });
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/runs.test.js`
Expected: PASS（4 个用例全过）。

- [ ] **Step 5: 提交**

```bash
git add hooks/lib/runs.js test/runs.test.js
git commit -m "feat: stop 写入本轮 startedAt 到 state.json"
```

---

## Task 3: `readState` 读出 `startedAt`（兼容旧数据）

**Files:**
- Modify: `src/state.ts`
- Test: `test/state.test.ts`

- [ ] **Step 1: 写失败测试**

修改 `test/state.test.ts`：把"合法内容返回结构化对象"用例的输入与期望都补上 `startedAt`，
并新增一个"缺 startedAt 回退空串"用例。

把现有用例：
```ts
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
```
替换为：
```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run test/state.test.ts`
Expected: FAIL——`readState` 返回对象不含 `startedAt`，`toEqual` 不匹配且回退用例为 `undefined`。

- [ ] **Step 3: 写最小实现**

修改 `src/state.ts`。接口 `RunState` 增加 `startedAt`：
```ts
export interface RunState {
  durationMs: number;
  status: string;
  startedAt: string;
  endedAt: string;
  conversationId: string;
}
```
`readState` 的返回对象增加 `startedAt`（缺失/非字符串回退空串）。把 return 块：
```ts
    return {
      durationMs: obj.durationMs,
      status: typeof obj.status === 'string' ? obj.status : 'completed',
      endedAt: typeof obj.endedAt === 'string' ? obj.endedAt : '',
      conversationId: typeof obj.conversationId === 'string' ? obj.conversationId : '',
    };
```
改为：
```ts
    return {
      durationMs: obj.durationMs,
      status: typeof obj.status === 'string' ? obj.status : 'completed',
      startedAt: typeof obj.startedAt === 'string' ? obj.startedAt : '',
      endedAt: typeof obj.endedAt === 'string' ? obj.endedAt : '',
      conversationId: typeof obj.conversationId === 'string' ? obj.conversationId : '',
    };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run test/state.test.ts`
Expected: PASS（含新增的回退用例）。

- [ ] **Step 5: 提交**

```bash
git add src/state.ts test/state.test.ts
git commit -m "feat: readState 读出 startedAt 并兼容旧数据"
```

---

## Task 4: `render()` tooltip 增加"开始于"并统一"结束于"格式

**Files:**
- Modify: `src/extension.ts`

> 说明：`extension.ts` 依赖 `vscode` 运行时，本项目沿例不为其写单元测试。
> 本任务靠 `tsc` 类型检查 + 全量测试回归验证，并附手动验证步骤。

- [ ] **Step 1: 修改导入**

`src/extension.ts` 第 5 行：
```ts
import { formatDuration } from './format';
```
改为：
```ts
import { formatDuration, formatDateTime } from './format';
```

- [ ] **Step 2: 改写 `render()` 组装 tooltip**

把现有 `render()` 中 `if (!state)` 之后的渲染部分：
```ts
  statusItem.text = `$(clock) ${formatDuration(state.durationMs)}`;
  const ended = state.endedAt ? new Date(state.endedAt).toLocaleTimeString() : '';
  statusItem.tooltip =
    `上一轮 agent 耗时 ${formatDuration(state.durationMs)}\n` +
    `结束于 ${ended}\n状态：${state.status}`;
```
替换为：
```ts
  statusItem.text = `$(clock) ${formatDuration(state.durationMs)}`;
  const started = formatDateTime(state.startedAt);
  const ended = formatDateTime(state.endedAt);
  // 逐行拼装：开始时间缺失（旧数据）时省略该行，避免显示无意义占位
  const lines = [`上一轮 agent 耗时 ${formatDuration(state.durationMs)}`];
  if (started) {
    lines.push(`开始于 ${started}`);
  }
  lines.push(`结束于 ${ended}`);
  lines.push(`状态：${state.status}`);
  statusItem.tooltip = lines.join('\n');
```

- [ ] **Step 3: 编译并跑全量测试（回归）**

Run: `npm run compile && npm test`
Expected: 编译无类型错误；vitest 全部用例通过（format/runs/state/parse/store/ensure-hooks/install-hooks/hook-bom）。

- [ ] **Step 4:（可选）手动验证 tooltip**

Run: `npm run compile`，在 Cursor 中以扩展开发宿主加载本扩展，向 agent 发一轮消息；
本轮结束后悬停状态栏 `⏱`，确认 tooltip 形如：
```
上一轮 agent 耗时 42s
开始于 2026-06-06 16:22:01
结束于 2026-06-06 16:22:43
状态：completed
```

- [ ] **Step 5: 提交**

```bash
git add src/extension.ts
git commit -m "feat: 状态栏 tooltip 增加\"开始于\"并统一结束时间格式"
```

---

## Self-Review

**1. Spec coverage（逐条核对设计文档）：**
- §3.1 hook 写 `startedAt` → Task 2 ✓
- §3.2 `readState` 读出并兼容缺失 → Task 3 ✓
- §3.3 `formatDateTime` 纯函数（本地、补零、空/非法返回空串）→ Task 1 ✓
- §3.4 tooltip 增"开始于"行、"结束于"统一格式、空值省略行 → Task 4 ✓
- §5 测试策略（format/runs/state 用例）→ Task 1/2/3 ✓

**2. Placeholder scan：** 无 TBD/TODO；每个改动步骤均含完整代码与精确替换位置。

**3. Type consistency：** 全程统一使用 `formatDateTime(iso: string): string`、字段名 `startedAt`、
`RunState.startedAt: string`、写入值 `new Date(start).toISOString()`。Task 1 定义、Task 3/4 引用一致。

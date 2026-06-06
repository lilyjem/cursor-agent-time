# 状态栏增加"本轮开始时间" — 设计文档

- 日期：2026-06-06
- 状态：已批准（待写实现计划）
- 关联项目：cursor-agent-time（Agent Time 扩展）
- 仓库：https://github.com/lilyjem/cursor-agent-time

## 1. 目标

在状态栏悬浮 tooltip 中，除现有的「上一轮 agent 耗时 / 结束于 / 状态」外，
再增加一行「**本轮开始时间**」，让用户能看到这一轮 agent 是何时开始的。

- 开始时间以完整「日期+时间」格式展示，例如 `开始于 2026-06-06 16:22:01`。
- 为保持一致，「结束于」也由原来的"仅时:分:秒"统一改为同样的完整日期+时间格式。

### 成功标准

- 一轮 agent 结束后，tooltip 中能看到正确的「开始于 <完整日期时间>」一行，
  其时间等于本轮 `beforeSubmitPrompt` 触发的时刻（本地时区）。
- 状态栏主文本不变，仍只显示耗时图标，如 `⏱ 42s`。
- 读到不含开始时间字段的旧 `state.json` 时不报错，且「开始于」一行被省略
  （向后兼容）。
- `npm test` 全部通过，新增/改动的单元测试覆盖格式化、数据写入与读取。

### 非目标（YAGNI）

- 不增加"运行中实时计时"、"历史多轮统计"、"会话 ID 展示"等其它内容
  （本期仅做开始时间）。
- 不改变状态栏主文本的内容与样式。
- 不改变双进程架构（hooks 写文件 → 扩展监听渲染）与计时逻辑本身。

## 2. 架构与数据流

整体结构不变，只在既有数据链路上「补一个字段、加一行展示」：

```
beforeSubmitPrompt(start.js) → runs.json.starts[cid] = 开始时间戳(ms)
stop(stop.js) → recordStop 读出开始时间戳：
    写 state.json {
      durationMs, status, endedAt,
      startedAt   ← 新增：new Date(开始时间戳).toISOString()
      conversationId
    }
扩展监听 state.json → readState 读出 startedAt
    → render() 在 tooltip 增加「开始于 formatDateTime(startedAt)」
```

开始时间戳本就存在于 `runs.json`（`recordStop` 计算耗时时已用到它），
因此无需改动 `start.js` 或新增任何采集逻辑，只是在写 `state.json` 时把它
一并以 ISO 字符串落盘。

## 3. 变更项明细

### 3.1 `hooks/lib/runs.js`（数据层）

`recordStop` 在写 `state.json` 时新增字段 `startedAt`：

- 值为本轮开始时间戳的 ISO 字符串：`new Date(start).toISOString()`。
- 其余字段（`version` / `durationMs` / `status` / `endedAt` / `conversationId`）保持不变。

### 3.2 `src/state.ts`（读取层）

- `RunState` 接口新增 `startedAt: string`。
- `readState` 读出 `startedAt`，当字段缺失或非字符串时回退为空串 `''`
  （兼容旧 `state.json`）。

### 3.3 `src/format.ts`（格式化，纯函数）

新增纯函数 `formatDateTime(iso: string): string`：

- 入参为 ISO 时间字符串，输出本地时区的 `YYYY-MM-DD HH:mm:ss`（各段补零）。
- 空串、非法/无法解析的时间一律返回空串 `''`，由调用方决定是否展示。

> 选用手写补零格式化（而非 `toLocaleString()`），以获得稳定可控、不随系统
> locale 漂移的输出，并可写确定性单元测试。

### 3.4 `src/extension.ts`（展示层）

`render()` 调整 tooltip 组装：

- 「结束于」改用 `formatDateTime(state.endedAt)`（统一为完整日期+时间）。
- 在「结束于」上方插入一行 `开始于 formatDateTime(state.startedAt)`。
- 当 `formatDateTime(state.startedAt)` 为空串时，**省略「开始于」整行**
  （不显示 `开始于 --`）。

tooltip 目标形态（有开始时间时）：

```
上一轮 agent 耗时 42s
开始于 2026-06-06 16:22:01
结束于 2026-06-06 16:22:43
状态：completed
```

## 4. 错误处理与边界情况

- **旧 `state.json` 无 `startedAt`**：`readState` 回退空串 → `render` 省略「开始于」行。
- **`startedAt` 非法/无法解析**：`formatDateTime` 返回空串 → 省略该行；不抛错。
- **沿用现有 fail-open**：hook 端任何异常仍被吞掉，绝不阻断 agent。
- **`endedAt` 为空或非法**：`formatDateTime` 返回空串，「结束于」显示为空，
  与现状行为基本一致（现状下 `endedAt` 为空时也显示空）。

## 5. 测试策略（TDD）

先写失败测试，再实现，保持本项目"纯函数易测"的风格：

- `test/format.test.ts`：为 `formatDateTime` 增加用例——
  - 正常 ISO → `YYYY-MM-DD HH:mm:ss`；
  - 月/日/时/分/秒需要补零的边界（如 `2026-01-02 03:04:05`）；
  - 空串、非法输入 → 返回空串。
- `test/runs.test.js`：断言 `recordStop` 写出的 `state.json` 含 `startedAt`，
  且其值等于开始时间戳对应的 ISO 字符串。
- `test/state.test.ts`：断言 `readState` 能读出 `startedAt`；缺失该字段时回退空串。
- 现有其余测试作为回归，保持全绿。

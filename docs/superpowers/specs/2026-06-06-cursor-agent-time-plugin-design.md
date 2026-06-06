# Cursor Agent 运行耗时插件 — 设计文档

- 日期：2026-06-06
- 状态：已批准（待写实现计划）
- 平台：Windows（win32），Cursor ≥ 1.7，本机需有 `node`（已具备）

## 1. 目标

在 Cursor 底部状态栏常驻显示**最近一轮 agent 运行耗时**（例如 `⏱ 42s`）。
"一次 agent 运行"定义为：用户发送一条消息 → 该轮 agent 循环 `stop`，
包含中间所有思考与工具调用的总墙钟时间。

### 成功标准

- 在任意项目里跑完一轮 agent 后，状态栏文本在约 1 秒内更新为本轮耗时。
- 计时来自官方 hooks，精确反映"本轮开始→结束"的真实墙钟时间。
- 插件全局生效（hooks 装在 `~/.cursor`），无需逐项目配置。
- 任何异常都不会阻断或拖慢 agent 运行。

### 非目标（YAGNI，本期不做）

- 不显示今日累计 / 会话累计 / 运行次数（只显示最近一轮）。
- 不做思考时间 / 工具时间的细分。
- 不发布到 Marketplace / Open VSX（仅个人本地使用，但结构上不排斥未来发布）。
- 不做系统弹窗通知。

## 2. 总体架构

两个组件，通过一个 JSON 文件单向通信，彻底解耦：

```
你点"发送"
   │  ① beforeSubmitPrompt hook  →  node start.js
   ▼
~/.cursor/agent-time/runs.json     记录每个会话的开始时间戳
   │
agent 本轮跑完（stop）
   │  ② stop hook  →  node stop.js  （读开始时间，算 duration，清理）
   ▼
~/.cursor/agent-time/state.json    最近一轮结果
   │  ③ 扩展用 Node fs 监听此文件
   ▼
Cursor 扩展  →  底部状态栏  "⏱ 42s"
```

设计原则：计时（hooks）与显示（扩展）职责单一、互不依赖；二者只通过文件契约耦合。

## 3. 组件一：计时 hooks（纯计时，无 UI）

### 配置：`~/.cursor/hooks.json`

注册两个用户级 hook（与用户已有的其它 hook **合并**，不覆盖）：

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [{ "command": "node ./hooks/agent-time/start.js" }],
    "stop": [{ "command": "node ./hooks/agent-time/stop.js" }]
  }
}
```

> 注：用户级 hook 的工作目录是 `~/.cursor/`，因此用相对路径 `./hooks/agent-time/...`。

### `start.js`（beforeSubmitPrompt）

- 从 stdin 读取 JSON，取 `conversation_id`。
- 把 `{ 会话ID: Date.now() }` 写入 `~/.cursor/agent-time/runs.json` 的 `starts` 映射。
- 输出 `{ "continue": true }`（不阻断提交），`exit 0`。

### `stop.js`（stop）

- 从 stdin 读取 JSON，取 `conversation_id` 与 `status`。
- 从 `runs.json` 找该会话的开始时间：
  - 找到：`durationMs = Date.now() - start`，写入 `state.json`，并从 `runs.json` 删除该会话条目。
  - 找不到：跳过写入（不显示错误数字）。
- 输出 `{}`（**绝不返回 `followup_message`**，避免触发 agent 再跑一轮），`exit 0`。

### 共享库

- `lib/store.js`：JSON 原子读写（读失败当空对象；写用"临时文件 + rename"避免并发损坏）。
- `lib/duration.js`：开始/结束配对与时长计算（纯函数，便于单测）。

### 键设计

用 `conversation_id` 作为键：同一会话一次只跑一轮，天然不串台；多个 composer 并行也互不影响。状态栏显示"最近完成的那一轮"，符合"只显示最近一轮"的需求。

## 4. 组件二：Cursor 扩展（纯显示）

### 清单：`package.json`

- 激活时机：`onStartupFinished`（每个窗口都加载）。
- 贡献：一个状态栏项（右侧、低优先级，不抢眼）。
- 配置项：`agentTime.autoManageHooks`（boolean，默认 `true`）。

### `extension.ts`

- 激活时：
  1. 若 `agentTime.autoManageHooks` 为真，执行**幂等**的 hooks 自动配置（见第 6 节）。
  2. 创建状态栏项，读取一次 `state.json` 渲染初值（无数据则显示 `⏱ --`）。
  3. 用 Node `fs.watch` 监听 `state.json`（失败回退到 `fs.watchFile` 轮询）。
  4. 文件变化时读出 `durationMs`，刷新文本 `⏱ {formatted}`；tooltip 显示
     "上一轮 agent 耗时；结束于 HH:MM:SS；状态：{status}"。
- 停用时：释放监听与状态栏项。

> 监听的文件位于 `~/.cursor/agent-time/`，在工作区之外，故用 Node `fs` 直接监听绝对路径，
> 不依赖 VS Code 的 workspace watcher（后者对工作区外路径不可靠）。

### `format.ts`（纯函数）

时长格式化规则：`<60s → "42s"`；`≥60s → "1m23s"`；`≥1h → "1h2m"`。

### `state.ts`（纯函数）

读取并校验 `state.json`，返回结构化结果或 `null`（文件缺失/损坏时）。

## 5. 数据契约

### `state.json`（扩展读取）

```json
{
  "version": 1,
  "durationMs": 42000,
  "status": "completed",
  "endedAt": "2026-06-06T00:42:00.000Z",
  "conversationId": "abc"
}
```

### `runs.json`（hooks 内部使用）

```json
{ "version": 1, "starts": { "abc": 1733440000000 } }
```

两个文件均位于 `~/.cursor/agent-time/`，首次写入时自动创建目录。

## 6. 安装方式：扩展自动配置 hooks（已选定）

目标：装一个 `.vsix` 即全部就绪。

- 扩展把 hook 脚本（`start.js`/`stop.js`/`lib/*`）打包在自身内部。
- 激活时**幂等地**：
  1. 确保 `~/.cursor/hooks/agent-time/` 下脚本存在且为最新（按版本/内容比对，必要时覆盖自身脚本）。
  2. 把两条 hook 条目**合并**进 `~/.cursor/hooks.json`：
     - 文件不存在 → 创建。
     - 已有其它 hook → 仅追加本插件条目，保留其余。
     - 已装过本插件条目 → 跳过（幂等，不重复添加）。
- 开关：`agentTime.autoManageHooks=false` 时扩展不碰 `hooks.json`，
  改由用户手动跑 `scripts/install.mjs`（备选路径，逻辑与自动配置共用 `install-hooks.ts`）。

合并逻辑通过本插件条目的可识别标记（命令路径 `./hooks/agent-time/...`）判断是否已安装，确保幂等。

## 7. 错误处理与边界情况

- **绝不阻断 agent**：`start.js`/`stop.js` 全程 `try/catch`，任何异常都输出安全 JSON 并 `exit 0`。
- **JSON 损坏/缺失**：读取 `try/catch`，当作空对象并自动重建。
- **stop 找不到 start**（装 hook 时会话已在进行）：跳过写入。
- **并发写**：原子写（临时文件 + rename）。
- **status 为 aborted/error**：仍计算并显示耗时，tooltip 标注状态。
- **首次无数据**：状态栏显示 `⏱ --`。
- **系统时钟漂移**：采用 `Date.now()` 墙钟，轻微漂移可接受。

## 8. 测试策略（TDD，先写测试）

纯逻辑函数用 `vitest` 单测：

- `lib/duration.js`：start/stop 配对、找不到 start、aborted/error。
- `lib/store.js`：读损坏文件容错、原子写、目录自动创建。
- `format.ts`：秒 / 分秒 / 时分 三档边界。
- `install-hooks.ts`：空文件 / 已有其它 hook / 已装过（幂等）三种合并场景。

扩展宿主 UI：手动端到端验证——装好后真跑一轮 agent，确认状态栏更新为耗时。

## 9. 目录结构（`d:\cursor\cursor-time`，作为扩展根目录）

```
cursor-time/
├─ package.json            扩展清单 + 开发依赖
├─ src/
│  ├─ extension.ts         激活、状态栏、文件监听、自动配置 hooks
│  ├─ format.ts            时长格式化（纯函数，测）
│  ├─ state.ts             读 state.json（测）
│  └─ install-hooks.ts     幂等合并 hooks.json（测）
├─ hooks/
│  ├─ start.js  stop.js    计时脚本（打包进扩展，安装时复制到 ~/.cursor）
│  └─ lib/store.js  lib/duration.js   JSON 原子读写 / 时长计算（测）
├─ scripts/install.mjs     手动安装（备选路径）
├─ test/                   vitest 单元测试
├─ docs/superpowers/specs/ 设计文档
└─ README.md
```

## 10. 依赖与前置条件

- 运行：Cursor ≥ 1.7（hooks 支持）、`node` 在 PATH 上。
- 开发：Node.js + `@types/vscode`、`typescript`、`vitest`、`@vscode/vsce`（打包）。

## 11. 风险与缓解

- **hooks 为 beta**：字段未来可能变动 → 只依赖 `conversation_id`/`status` 等稳定基础字段，并对缺字段做容错。
- **`stop` 不在 cloud agent 触发**：本插件面向本地 IDE 使用，符合预期，文档注明。
- **`node` 不在 PATH**：开发机已具备；README 注明前置条件，hook 失败也只是不显示、不影响 agent。

# Agent Time

[![Release](https://img.shields.io/github/v/release/lilyjem/cursor-agent-time?label=release)](https://github.com/lilyjem/cursor-agent-time/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

在 Cursor 底部状态栏显示最近一轮 agent 运行耗时（如 `⏱ 42s`）。

## 工作原理
- Cursor Hooks（`beforeSubmitPrompt` + `stop`）精确计时，写入 `~/.cursor/agent-time/state.json`。
- 本扩展监听该文件并渲染状态栏；激活时自动幂等配置 `~/.cursor/hooks.json`。

## 前提
- Cursor ≥ 1.7、`node` 在 PATH 上、Windows/macOS/Linux 均可。

## 从 GitHub Release 安装（推荐）
1. 到 [Releases](https://github.com/lilyjem/cursor-agent-time/releases) 下载最新 `.vsix`。
2. 命令面板执行 `Extensions: Install from VSIX...` 选择该文件，或在终端执行：

```
cursor --install-extension cursor-agent-time-0.1.0.vsix
```

## 从源码安装
见底部「构建与安装」。

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

### 手动配置（当关闭 agentTime.autoManageHooks 时）
若关闭了自动配置，可手动运行（需先 `npm run compile`）：

```
node scripts/install.mjs
```

它复用扩展同一套逻辑，把计时 hooks 写入 `~/.cursor`。

# Agent Time

在 Cursor 底部状态栏显示最近一轮 agent 运行耗时（如 `⏱ 42s`）。

## 工作原理
- Cursor Hooks（`beforeSubmitPrompt` + `stop`）精确计时，写入 `~/.cursor/agent-time/state.json`。
- 本扩展监听该文件并渲染状态栏；激活时自动幂等配置 `~/.cursor/hooks.json`。

## 前提
- Cursor ≥ 1.7、`node` 在 PATH 上、Windows/macOS/Linux 均可。

## 安装
见底部「构建与安装」。

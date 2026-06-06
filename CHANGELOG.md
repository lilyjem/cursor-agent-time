# 变更记录

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-06-06

### 新增
- 状态栏显示最近一轮 agent 运行耗时（`⏱`）。
- 基于官方 Cursor Hooks（`beforeSubmitPrompt` + `stop`）精确计时。
- 激活时幂等自动配置 `~/.cursor/hooks.json`（可通过 `agentTime.autoManageHooks` 关闭）。
- 跨平台支持（Windows / macOS / Linux）。
- 备选手动安装脚本 `scripts/install.mjs`。

[0.1.0]: https://github.com/lilyjem/cursor-agent-time/releases/tag/v0.1.0

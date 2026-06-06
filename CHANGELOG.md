# 变更记录

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-06-06

### 修复
- 修复 Windows 下计时始终不更新、状态栏停留在旧值的问题。根因是 Cursor 通过 stdin 传给 hook 的 JSON 带 UTF-8 BOM(U+FEFF)，`JSON.parse` 抛错被静默吞掉，导致计时数据从未写入。
- 新增 `parseHookInput()`：解析前先剥除 BOM，失败时安全返回空对象（fail-open）。
- 新增单元测试与端到端 BOM 回归测试。

## [0.1.0] - 2026-06-06

### 新增
- 状态栏显示最近一轮 agent 运行耗时（`⏱`）。
- 基于官方 Cursor Hooks（`beforeSubmitPrompt` + `stop`）精确计时。
- 激活时幂等自动配置 `~/.cursor/hooks.json`（可通过 `agentTime.autoManageHooks` 关闭）。
- 跨平台支持（Windows / macOS / Linux）。
- 备选手动安装脚本 `scripts/install.mjs`。

[0.1.1]: https://github.com/lilyjem/cursor-agent-time/releases/tag/v0.1.1
[0.1.0]: https://github.com/lilyjem/cursor-agent-time/releases/tag/v0.1.0

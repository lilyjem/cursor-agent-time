# 完善仓库内容并发布 v0.1.0 Release — 设计文档

- 日期：2026-06-06
- 状态：已批准（待写实现计划）
- 关联项目：cursor-agent-time（Agent Time 扩展）
- 仓库：https://github.com/lilyjem/cursor-agent-time

## 1. 目标

把已完成开发的 Agent Time 扩展打磨成"可对外发布"的状态，并在 GitHub 上发布
第一个功能完整版本 `v0.1.0`：

- 补齐发布所需的仓库元数据与配套文件（元数据、许可证、变更记录、图标、README）。
- 构建 `.vsix` 安装包，并通过 GitHub Releases 对外分发（**不**发布到 VS Code Marketplace / Open VSX）。

### 成功标准

- `npm install && npm run compile && npm test` 全部通过。
- `npm run package` 成功生成 `cursor-agent-time-0.1.0.vsix`，且 `.vsix` 内含运行所需文件
  （`out/`、`hooks/`、`README.md`、`LICENSE`、`CHANGELOG.md`、`icon.png`）。
- `main` 分支含全部完善改动，存在 `v0.1.0` tag。
- GitHub 上存在 `v0.1.0` Release，附带 `.vsix` 资产与发布说明。

### 非目标（YAGNI）

- 不发布到 VS Code Marketplace / Open VSX。
- 不新增 GitHub Actions CI/发布工作流（本期手动发布）。
- 不改动扩展功能逻辑（仅元数据/文档/发布）。

## 2. 发布与分支策略（已选定）

在 `feat/agent-time` 完成全部完善工作 → 合并到 `main`（`--no-ff`）→ 在 `main` 打
`v0.1.0` tag → 构建 `.vsix` → 用 `gh release create` 把 `.vsix` 附加到 GitHub Release。

> 依赖前提：`gh` CLI 已安装且已认证。若未认证，改用 GitHub MCP（user-github）创建
> Release，或暂停让用户授权后继续。

## 3. 变更项明细

### 3.1 `package.json` 元数据

在不改动 `engines` / `contributes` / `scripts` / `devDependencies` 的前提下：

- `version`: `0.0.1` → `0.1.0`
- `publisher`: `local` → `lilyjem`
- 新增 `license`: `"MIT"`
- 新增 `author`: `"lilyjem"`
- 新增 `icon`: `"icon.png"`
- 新增 `keywords`: `["cursor", "agent", "timer", "status-bar", "hooks", "duration"]`
- 新增 `repository`: `{ "type": "git", "url": "https://github.com/lilyjem/cursor-agent-time.git" }`
- 新增 `bugs`: `{ "url": "https://github.com/lilyjem/cursor-agent-time/issues" }`
- 新增 `homepage`: `"https://github.com/lilyjem/cursor-agent-time#readme"`

### 3.2 `LICENSE`

标准 MIT 许可证全文，`Copyright (c) 2026 lilyjem`。

### 3.3 `CHANGELOG.md`

Keep a Changelog 风格。首个条目：

```
## [0.1.0] - 2026-06-06
### Added
- 状态栏显示最近一轮 agent 运行耗时（⏱）
- 基于官方 Cursor Hooks（beforeSubmitPrompt + stop）精确计时
- 激活时幂等自动配置 ~/.cursor/hooks.json（可通过 agentTime.autoManageHooks 关闭）
- 跨平台支持（Windows/macOS/Linux）
- 备选手动安装脚本 scripts/install.mjs
```

### 3.4 `icon.png`

生成一个 128×128 PNG 扩展图标（时钟/计时主题，深色背景，清晰可辨），放在仓库根目录，
由 `package.json` 的 `icon` 字段引用。需确保 `.vscodeignore` 不排除该文件（当前规则不排除）。

### 3.5 `README.md`

- 顶部增加徽章：Release 版本徽章、MIT License 徽章（shields.io）。
- 新增"从 GitHub Release 安装"章节：到 Releases 页下载 `.vsix`，用
  `cursor --install-extension <file>.vsix` 或命令面板 Install from VSIX 安装。
- 保留现有"工作原理/前提/构建与安装/使用/卸载"等内容。

## 4. 发布流程（含验证，证据优先）

1. 完成 3.1–3.5 全部文件改动。
2. 验证：`npm install` → `npm run compile` → `npm test`，确认全绿（保留输出为证据）。
3. 构建：`npm run package`，确认生成 `cursor-agent-time-0.1.0.vsix`。
4. 提交完善改动到 `feat/agent-time`。
5. 切到 `main`，`git merge --no-ff feat/agent-time`。
6. `git tag -a v0.1.0 -m "v0.1.0"`，`git push origin main --follow-tags`。
7. `gh release create v0.1.0 cursor-agent-time-0.1.0.vsix --title "..." --notes "..."`。
8. 验证 Release 页存在且 `.vsix` 资产可见。

## 5. 错误处理与边界情况

- **`vsce package` 因元数据缺失报错/告警**：3.1 已补齐 `repository`/`license`/`icon`，
  应消除主要告警；若仍报错按其提示修正。
- **`icon` 引用但文件缺失会导致打包失败**：必须先生成 `icon.png` 再打包。
- **`gh` 未认证**：回退到 GitHub MCP 创建 Release，或暂停让用户 `gh auth login`。
- **`main` 合并冲突**：本期改动均为新增/独立文件，预期无冲突；若有则人工解决。
- **测试不通过**：停止发布，先用 systematic-debugging 修复，证据先于发布。

## 6. 测试策略

- 复用现有 vitest 单元测试套件作为发布前回归（不新增功能测试，因无功能变更）。
- 打包产物通过检查 `.vsix` 内容清单验证关键文件是否包含。
- Release 通过 `gh release view v0.1.0` 验证存在性与资产。

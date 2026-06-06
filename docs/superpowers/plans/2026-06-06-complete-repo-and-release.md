# 完善仓库内容并发布 v0.1.0 Release 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 cursor-agent-time 仓库的发布配套文件（元数据/许可证/变更记录/图标/README），构建 `.vsix` 并通过 GitHub Releases 发布 `v0.1.0`。

**Architecture:** 不改动扩展功能逻辑，仅新增/修改元数据与文档文件；复用现有 vitest 套件做发布前回归；用 `vsce` 打包、`git` 打 tag、`gh` 创建 Release。

**Tech Stack:** Node.js、TypeScript、vitest、@vscode/vsce、git、GitHub CLI（gh）。

---

## File Structure

- 修改：`package.json`（元数据）
- 新增：`LICENSE`（MIT）
- 新增：`CHANGELOG.md`（变更记录）
- 新增：`icon.png`（128×128 扩展图标）
- 修改：`README.md`（徽章 + Release 安装说明）

---

### Task 1: 完善 package.json 元数据

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 修改 package.json**

将文件改为（仅在原基础上增改元数据，保留 contributes/scripts/devDependencies）：

```json
{
  "name": "cursor-agent-time",
  "displayName": "Agent Time",
  "description": "在状态栏显示最近一轮 Cursor Agent 运行耗时",
  "version": "0.1.0",
  "publisher": "lilyjem",
  "author": "lilyjem",
  "license": "MIT",
  "icon": "icon.png",
  "keywords": ["cursor", "agent", "timer", "status-bar", "hooks", "duration"],
  "repository": { "type": "git", "url": "https://github.com/lilyjem/cursor-agent-time.git" },
  "bugs": { "url": "https://github.com/lilyjem/cursor-agent-time/issues" },
  "homepage": "https://github.com/lilyjem/cursor-agent-time#readme",
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

- [ ] **Step 2: 校验 JSON 合法**

Run: `node -e "require('./package.json')"`
Expected: 无输出、exit 0。

---

### Task 2: 添加 MIT LICENSE

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: 创建 LICENSE（MIT 全文）**

```
MIT License

Copyright (c) 2026 lilyjem

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

### Task 3: 添加 CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

- [ ] **Step 1: 创建 CHANGELOG.md**

```markdown
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
```

---

### Task 4: 生成 icon.png 并确认引用

**Files:**
- Create: `icon.png`

- [ ] **Step 1: 生成 128×128 时钟主题图标**（使用图像生成工具，深色背景 + 计时概念，简洁可辨）。
- [ ] **Step 2: 确认 `.vscodeignore` 未排除 icon.png**（当前规则不排除，无需改动）。
- [ ] **Step 3: 确认 package.json 的 `icon` 字段已指向 `icon.png`**（Task 1 已设置）。

---

### Task 5: 润色 README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 顶部加入徽章 + 从 Release 安装章节**

在标题下方加入：

```markdown
[![Release](https://img.shields.io/github/v/release/lilyjem/cursor-agent-time?label=release)](https://github.com/lilyjem/cursor-agent-time/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
```

在"安装"章节加入：

```markdown
## 从 GitHub Release 安装（推荐）
1. 到 [Releases](https://github.com/lilyjem/cursor-agent-time/releases) 下载最新 `.vsix`。
2. 命令面板 `Extensions: Install from VSIX...` 选择该文件，或执行：
   `cursor --install-extension cursor-agent-time-0.1.0.vsix`
```

---

### Task 6: 发布前验证与打包

- [ ] **Step 1: 安装依赖**

Run: `npm install`
Expected: exit 0。

- [ ] **Step 2: 编译**

Run: `npm run compile`
Expected: exit 0，生成 `out/extension.js` 等。

- [ ] **Step 3: 运行测试**

Run: `npm test`
Expected: 全部测试通过（vitest 绿）。

- [ ] **Step 4: 打包**

Run: `npm run package`
Expected: 生成 `cursor-agent-time-0.1.0.vsix`，无致命错误。

- [ ] **Step 5: 核对 .vsix 内容**

Run: `npx vsce ls`（或解压检查）
Expected: 包含 `out/`、`hooks/`、`README.md`、`LICENSE`、`CHANGELOG.md`、`icon.png`、`package.json`。

---

### Task 7: 提交、合并 main、打 tag、发布 Release

- [ ] **Step 1: 提交完善改动**

```bash
git add package.json LICENSE CHANGELOG.md icon.png README.md docs/superpowers/plans/2026-06-06-complete-repo-and-release.md
git commit -m "chore: 完善发布元数据与配套文件，版本升至 0.1.0"
```

- [ ] **Step 2: 合并到 main**

```bash
git checkout main
git pull origin main
git merge --no-ff feat/agent-time -m "merge: 发布 v0.1.0"
```

- [ ] **Step 3: 打 tag 并推送**

```bash
git tag -a v0.1.0 -m "v0.1.0：首个功能完整版本"
git push origin main --follow-tags
```

- [ ] **Step 4: 创建 GitHub Release（附 .vsix）**

```bash
gh release create v0.1.0 cursor-agent-time-0.1.0.vsix --title "v0.1.0" --notes-file CHANGELOG.md
```
> 若 `gh` 未认证：先 `gh auth login`，或改用 GitHub MCP（user-github）创建 Release。

- [ ] **Step 5: 验证 Release**

Run: `gh release view v0.1.0`
Expected: 显示 v0.1.0 与 `.vsix` 资产。

---

## Self-Review

- **Spec 覆盖**：元数据(Task1)/LICENSE(Task2)/CHANGELOG(Task3)/icon(Task4)/README(Task5)/验证打包(Task6)/发布(Task7) 全覆盖 spec 的 §3–§4。
- **占位符**：无 TBD/TODO；各文件给出完整内容。
- **一致性**：版本号 `0.1.0`、publisher `lilyjem`、tag `v0.1.0`、`.vsix` 名 `cursor-agent-time-0.1.0.vsix` 全文一致。

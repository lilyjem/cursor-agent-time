// 手动安装：当关闭 agentTime.autoManageHooks（或不想用扩展自动配置）时，
// 运行 `node scripts/install.mjs` 即可把计时 hooks 配好（复用扩展同一套逻辑）。
// 前提：先 `npm run compile` 生成 out/install-hooks.js。
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

const { ensureHooksInstalled } = require(path.join(repoRoot, 'out', 'install-hooks.js'));
ensureHooksInstalled(os.homedir(), path.join(repoRoot, 'hooks'));
console.log('Agent Time hooks 已安装到 ~/.cursor');

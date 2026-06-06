#!/usr/bin/env node
// beforeSubmitPrompt hook：记录本轮 agent 开始时间。任何异常都不阻断提交。
const os = require('os');
const path = require('path');
const { readStdin } = require('./lib/stdin');
const { parseHookInput } = require('./lib/parse');
const { recordStart } = require('./lib/runs');

const DATA_DIR = path.join(os.homedir(), '.cursor', 'agent-time');

(async () => {
  try {
    // parseHookInput 会剥掉 Cursor(Windows) 加在 stdin 上的 UTF-8 BOM 再解析
    const input = parseHookInput(await readStdin());
    if (input.conversation_id) {
      recordStart(DATA_DIR, input.conversation_id, Date.now());
    }
  } catch {
    // 计时失败不能影响 agent，吞掉异常
  }
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
})();

#!/usr/bin/env node
// stop hook：计算并写入本轮耗时。绝不返回 followup_message（不让 agent 多跑）。
const os = require('os');
const path = require('path');
const { readStdin } = require('./lib/stdin');
const { recordStop } = require('./lib/runs');

const DATA_DIR = path.join(os.homedir(), '.cursor', 'agent-time');

(async () => {
  try {
    const input = JSON.parse((await readStdin()) || '{}');
    if (input.conversation_id) {
      recordStop(DATA_DIR, input.conversation_id, input.status || 'completed', Date.now());
    }
  } catch {
    // 忽略，绝不阻断
  }
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
})();

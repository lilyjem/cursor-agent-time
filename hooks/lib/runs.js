// 计时核心：记录每个会话的开始时间；结束时计算耗时并写入 state.json
const path = require('path');
const { readJson, writeJsonAtomic } = require('./store');

function runsPath(dataDir) {
  return path.join(dataDir, 'runs.json');
}
function statePath(dataDir) {
  return path.join(dataDir, 'state.json');
}

// 记录某会话的本轮开始时间
function recordStart(dataDir, conversationId, nowMs) {
  const runs = readJson(runsPath(dataDir), { version: 1, starts: {} });
  if (!runs.starts || typeof runs.starts !== 'object') {
    runs.starts = {};
  }
  runs.starts[conversationId] = nowMs;
  writeJsonAtomic(runsPath(dataDir), runs);
}

// 结束某会话本轮：找到开始时间则写 state 并清理，返回是否写出
function recordStop(dataDir, conversationId, status, nowMs) {
  const runs = readJson(runsPath(dataDir), { version: 1, starts: {} });
  const start = runs.starts ? runs.starts[conversationId] : undefined;
  if (typeof start !== 'number') {
    return false;
  }
  const durationMs = Math.max(0, nowMs - start);
  writeJsonAtomic(statePath(dataDir), {
    version: 1,
    durationMs,
    status,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(nowMs).toISOString(),
    conversationId,
  });
  delete runs.starts[conversationId];
  writeJsonAtomic(runsPath(dataDir), runs);
  return true;
}

module.exports = { recordStart, recordStop, runsPath, statePath };

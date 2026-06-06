import * as fs from 'fs';

// 状态栏需要的最近一轮运行结果
export interface RunState {
  durationMs: number;
  status: string;
  endedAt: string;
  conversationId: string;
}

// 读取并校验 state.json；缺失/损坏/字段非法时返回 null
export function readState(filePath: string): RunState | null {
  try {
    const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (typeof obj.durationMs !== 'number') {
      return null;
    }
    return {
      durationMs: obj.durationMs,
      status: typeof obj.status === 'string' ? obj.status : 'completed',
      endedAt: typeof obj.endedAt === 'string' ? obj.endedAt : '',
      conversationId: typeof obj.conversationId === 'string' ? obj.conversationId : '',
    };
  } catch {
    return null;
  }
}

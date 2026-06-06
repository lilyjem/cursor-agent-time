import { describe, it, expect } from 'vitest';
import { mergeHooksConfig } from '../src/install-hooks';

const CMDS = {
  startCmd: 'node "/home/u/.cursor/hooks/agent-time/start.js"',
  stopCmd: 'node "/home/u/.cursor/hooks/agent-time/stop.js"',
};

describe('mergeHooksConfig', () => {
  it('空配置会加上两个 hook 并标记已变更', () => {
    const { config, changed } = mergeHooksConfig({}, CMDS);
    expect(changed).toBe(true);
    expect(config.version).toBe(1);
    expect(config.hooks.beforeSubmitPrompt[0].command).toContain('agent-time/start.js');
    expect(config.hooks.stop[0].command).toContain('agent-time/stop.js');
  });
  it('给条目带上 timeout 兜底', () => {
    const { config } = mergeHooksConfig({}, CMDS);
    expect(config.hooks.beforeSubmitPrompt[0].timeout).toBe(5);
    expect(config.hooks.stop[0].timeout).toBe(5);
  });
  it('保留用户已有的其它 hook', () => {
    const existing = { version: 1, hooks: { afterFileEdit: [{ command: './format.sh' }] } };
    const { config } = mergeHooksConfig(existing, CMDS);
    expect(config.hooks.afterFileEdit[0].command).toBe('./format.sh');
    expect(config.hooks.beforeSubmitPrompt[0].command).toContain('start.js');
  });
  it('已安装则幂等（changed 为 false，不重复添加）', () => {
    const once = mergeHooksConfig({}, CMDS).config;
    const { changed, config } = mergeHooksConfig(once, CMDS);
    expect(changed).toBe(false);
    expect(config.hooks.beforeSubmitPrompt).toHaveLength(1);
    expect(config.hooks.stop).toHaveLength(1);
  });
  it('保留同一事件下用户已有的别的条目', () => {
    const existing = { hooks: { stop: [{ command: './my-stop.sh' }] } };
    const { config } = mergeHooksConfig(existing, CMDS);
    expect(config.hooks.stop).toHaveLength(2);
    expect(config.hooks.stop[0].command).toBe('./my-stop.sh');
    expect(config.hooks.stop[1].command).toContain('stop.js');
  });
  it('不就地修改传入的原对象（纯函数语义）', () => {
    const existing: any = { hooks: { stop: [{ command: './my-stop.sh' }] } };
    mergeHooksConfig(existing, CMDS);
    expect(existing.hooks.stop).toHaveLength(1);
    expect(existing.hooks.beforeSubmitPrompt).toBeUndefined();
  });
});

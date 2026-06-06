import { describe, it, expect } from 'vitest';
import { mergeHooksConfig } from '../src/install-hooks';

describe('mergeHooksConfig', () => {
  it('空配置会加上两个 hook 并标记已变更', () => {
    const { config, changed } = mergeHooksConfig({});
    expect(changed).toBe(true);
    expect(config.version).toBe(1);
    expect(config.hooks.beforeSubmitPrompt[0].command).toContain('hooks/agent-time/start.js');
    expect(config.hooks.stop[0].command).toContain('hooks/agent-time/stop.js');
  });
  it('保留用户已有的其它 hook', () => {
    const existing = { version: 1, hooks: { afterFileEdit: [{ command: './format.sh' }] } };
    const { config } = mergeHooksConfig(existing);
    expect(config.hooks.afterFileEdit[0].command).toBe('./format.sh');
    expect(config.hooks.beforeSubmitPrompt[0].command).toContain('start.js');
  });
  it('已安装则幂等（changed 为 false，不重复添加）', () => {
    const once = mergeHooksConfig({}).config;
    const { changed, config } = mergeHooksConfig(once);
    expect(changed).toBe(false);
    expect(config.hooks.beforeSubmitPrompt).toHaveLength(1);
    expect(config.hooks.stop).toHaveLength(1);
  });
  it('保留同一事件下用户已有的别的条目', () => {
    const existing = { hooks: { stop: [{ command: './my-stop.sh' }] } };
    const { config } = mergeHooksConfig(existing);
    expect(config.hooks.stop).toHaveLength(2);
    expect(config.hooks.stop[0].command).toBe('./my-stop.sh');
    expect(config.hooks.stop[1].command).toContain('stop.js');
  });
});

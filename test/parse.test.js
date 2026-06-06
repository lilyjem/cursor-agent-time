// vitest 已开启 globals，describe/it/expect 为全局，无需 require('vitest')
const { parseHookInput } = require('../hooks/lib/parse');

describe('parseHookInput', () => {
  it('解析普通 JSON', () => {
    const out = parseHookInput('{"conversation_id":"abc","status":"completed"}');
    expect(out.conversation_id).toBe('abc');
    expect(out.status).toBe('completed');
  });

  // 这是真正的 bug：Cursor 在 Windows 下通过 stdin 传入的 JSON 带 UTF-8 BOM(U+FEFF)
  it('跳过 UTF-8 BOM 前缀后正确解析', () => {
    const withBom = '\uFEFF{"conversation_id":"bom-case"}';
    const out = parseHookInput(withBom);
    expect(out.conversation_id).toBe('bom-case');
  });

  it('空字符串返回空对象', () => {
    expect(parseHookInput('')).toEqual({});
  });

  it('非法 JSON 返回空对象（不抛异常）', () => {
    expect(parseHookInput('not json')).toEqual({});
  });

  it('非字符串输入返回空对象', () => {
    expect(parseHookInput(undefined)).toEqual({});
    expect(parseHookInput(null)).toEqual({});
  });
});

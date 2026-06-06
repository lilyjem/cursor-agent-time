// 解析 hook 通过 stdin 传入的 JSON。
// 关键：Cursor 在 Windows 下会给 stdin 内容加 UTF-8 BOM(U+FEFF)，
// 原生 JSON.parse 不跳过 BOM 会直接抛 SyntaxError，必须先剥掉。
// 任何解析失败都返回空对象，保证 hook fail-open（绝不阻断 agent）。
function parseHookInput(raw) {
  if (typeof raw !== 'string') {
    return {};
  }
  // 剥掉可能存在的 BOM 前缀，再去掉首尾空白
  const cleaned = raw.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return {};
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

module.exports = { parseHookInput };

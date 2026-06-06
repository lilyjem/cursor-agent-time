// 读取全部 stdin 文本（hook 通过 stdin 收到 JSON）
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    // 无 stdin（极端情况）时不至于卡死
    process.stdin.on('error', () => resolve(data));
  });
}

module.exports = { readStdin };

// API 调试脚本 — 运行: node API_BASE.mjs [自定义API_BASE]
// 例: node API_BASE.mjs https://xxxx-a-b-c-d.run.pinggy-free.link
// 注意: pinggy 免费隧道需带 X-Pinggy-No-Screen 头,否则请求会被警告页拦截
const API_BASE = process.argv[2] ?? 'https://zjyow-222-35-94-238.run.pinggy-free.link';

try {
  // 登录(若提示用户名或密码错误,可先调用 /api/auth/register 注册)
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Pinggy-No-Screen': '1' },
    credentials: 'include',
    body: JSON.stringify({ username: 'test', password: '123456' })
  });
  console.log('登录状态:', loginRes.status, await loginRes.text());
  // Node 的 fetch 不像浏览器自动管理 Cookie,手动转发纯 name=value 对(去掉 Path 等属性)
  const cookie = loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('登录未返回会话 Cookie,无法继续');
  console.log('Cookie:', cookie);

  // 聊天(Agent 模式) — Agent 推理较慢,耐心等待
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pinggy-No-Screen': '1',
      Cookie: cookie
    },
    credentials: 'include',
    body: JSON.stringify({
      message: '北京今天天气怎么样',
      mode: 'agent',           // agent / rag / llm
      temperature: 0.7,
      model: 'llama3.2:1b'
    })
  });
  console.log('聊天状态:', res.status);
  const data = await res.json();  // { reply, trace? }
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('请求失败:', err.cause?.code || err.message);
  console.error('提示:通常是 pinggy 隧道已过期或所在节点阻断(Node fetch 会 ECONNRESET),');
  console.error('     重启 pinggy 换节点后运行: node API_BASE.mjs <新的隧道URL>');
  process.exit(1);
}

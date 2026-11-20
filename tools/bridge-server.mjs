// 开发桥接服务端：node tools/bridge-server.mjs
// 插件侧边栏 GET /poll 领命令、POST /result 交结果；开发者 POST /cmd 发命令并等结果。
import http from 'node:http';

const queue = [];          // 待领取的命令
const waiters = [];        // 正在长轮询的插件请求
const pending = new Map(); // id -> 等结果的 /cmd 响应
let seq = 0;

const ALLOWED_EXT_ID = process.env.BRIDGE_EXT_ID || '';
const isExtOrigin = (origin) => {
  if (!origin) return false;
  if (ALLOWED_EXT_ID) return origin === `chrome-extension://${ALLOWED_EXT_ID}`;
  return /^chrome-extension:\/\/[a-z]{32}$/.test(origin);
};

const send = (res, code, obj, extraHeaders = {}) => {
  res.writeHead(code, { 'content-type': 'application/json', ...extraHeaders });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
};
const body = (req, maxBytes = 1024 * 1024) => new Promise((resolve, reject) => {
  let s = '', len = 0;
  req.on('data', d => {
    len += d.length;
    if (len > maxBytes) { req.destroy(); reject(new Error('body too large')); return; }
    s += d;
  });
  req.on('end', () => resolve(s));
  req.on('error', reject);
});

function dispatch() {
  while (queue.length && waiters.length) {
    const w = waiters.shift();
    clearTimeout(w.timer);
    send(w.res, 200, queue.shift(), w.cors);
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const origin = req.headers.origin || '';

  // 仅允许来自 Chrome 扩展的 /poll、/result（含预检）；彻底禁止普通网页跨站访问
  if (url.pathname === '/poll' || url.pathname === '/result') {
    if (origin && !isExtOrigin(origin)) return send(res, 403, { ok: false, error: 'forbidden origin' });
    const cors = origin ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {};
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-maitian-bridge' });
      return res.end();
    }
    if (req.headers['x-maitian-bridge'] !== '1') return send(res, 403, { ok: false, error: 'missing bridge header' }, cors);
    if (req.method === 'GET' && url.pathname === '/poll') {
      const w = { res, cors, timer: setTimeout(() => { const idx = waiters.indexOf(w); if (idx >= 0) waiters.splice(idx, 1); send(w.res, 204, undefined, cors); }, 20000) };
      waiters.push(w); dispatch(); return;
    }
    if (req.method === 'POST' && url.pathname === '/result') {
      let r;
      try { r = JSON.parse(await body(req, 20 * 1024 * 1024)); } catch { return send(res, 400, { ok: false, error: 'invalid json' }, cors); }
      const p = pending.get(r.id);
      if (p) { pending.delete(r.id); clearTimeout(p.timer); send(p.res, 200, r); }
      return send(res, 200, {}, cors);
    }
    return send(res, 405, { ok: false, error: 'method not allowed' }, cors);
  }

  // /cmd 与 /status 只接受本机非浏览器进程调用（禁止携带 Origin / Sec-Fetch-Mode）
  if (origin || req.headers['sec-fetch-mode']) return send(res, 403, { ok: false, error: 'browser origin forbidden' });
  if (req.method === 'POST' && url.pathname === '/cmd') {
    if (req.headers['x-maitian-bridge'] !== '1') return send(res, 403, { ok: false, error: 'missing bridge header' });
    let cmd;
    try { cmd = JSON.parse(await body(req, 2 * 1024 * 1024)); } catch { return send(res, 400, { ok: false, error: 'invalid json' }); }
    cmd.id = ++seq;
    const timeout = cmd.timeout || 60000;
    pending.set(cmd.id, { res, timer: setTimeout(() => { pending.delete(cmd.id); send(res, 504, { ok: false, error: '插件没有响应（侧边栏开着吗？）' }); }, timeout) });
    queue.push(cmd); dispatch(); return;
  }
  if (req.method === 'GET' && url.pathname === '/status') return send(res, 200, { waiting: waiters.length, queued: queue.length });
  send(res, 404, {});
}).listen(8765, '127.0.0.1', () => console.log('bridge on 127.0.0.1:8765'));

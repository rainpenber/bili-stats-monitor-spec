/*
  Bili Stats Monitor Mock Server (MVP)
  - 仅 GET/POST，变更/删除通过 POST + body.action
  - 响应结构：{ code, message, data }
  - 时间：ISO 8601（Asia/Shanghai）
  - 端口：8080（可改 PORT 环境变量）
*/

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 8080;

// Utilities
const now = () => new Date().toISOString();
const ok = (data = null, message = 'ok') => ({ code: 0, message, data });
const err = (message = 'error', code = 1) => ({ code, message, data: null });

// In-memory state (non-persistent)
let users = [
  { id: '1', username: 'admin', role: 'admin' },
  { id: '2', username: 'viewer', role: 'viewer' },
];
let currentUser = users[0];

let accounts = [
  { id: 'a1', uid: '123456', nickname: 'Admin主号', bind_method: 'cookie', status: 'valid', last_failures: 0, bound_at: now() },
  { id: 'a2', uid: '654321', nickname: '副号', bind_method: 'qrcode', status: 'valid', last_failures: 1, bound_at: now() },
];

// QR login sessions
const qrSessions = new Map(); // session_id -> { status, createdAt }

// Tasks dataset
let tasks = [
  {
    id: 't_video_1', type: 'video', target_id: 'BV1abc123XYZ', account_id: 'a1',
    status: 'running', reason: null,
    strategy: { mode: 'smart' },
    deadline: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    created_at: now(), updated_at: now(),
    tags: ['剪辑', '测评'],
    latest_sample: { play: 152340, last_collected_at: now() },
    media: { cover_url: 'https://via.placeholder.com/320x180?text=Cover' },
    title: '如何高效剪辑：10个必备技巧'
  },
  {
    id: 't_video_2', type: 'video', target_id: 'BV2def456LMN', account_id: null,
    status: 'stopped', reason: null,
    strategy: { mode: 'fixed', value: 30, unit: 'minute' },
    deadline: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    created_at: now(), updated_at: now(),
    tags: ['VLOG'],
    latest_sample: { play: 98765, last_collected_at: now() },
    media: { cover_url: 'https://via.placeholder.com/320x180?text=Cover' },
    title: '周末VLOG｜城市徒步探索'
  },
  {
    id: 't_author_1', type: 'author', target_id: '777888', account_id: 'a2',
    status: 'running', reason: null,
    strategy: { mode: 'fixed', value: 4, unit: 'hour' },
    deadline: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    created_at: now(), updated_at: now(),
    tags: ['主频道'],
    latest_sample: { fans: 120345, last_collected_at: now() },
    media: { avatar_url: 'https://via.placeholder.com/120x120?text=Avatar' },
    nickname: '小明的数码屋'
  }
];

// Simple metrics generators
function genVideoSeries() {
  const base = Date.now() - 7 * 24 * 3600 * 1000;
  const series = [];
  let play = 90000;
  let watching = 1000;
  for (let i = 0; i < 7 * 24; i += 4) { // every 4 hours
    play += Math.floor(Math.random() * 400 + 200);
    watching = Math.max(0, watching + Math.floor(Math.random() * 50 - 20));
    series.push({ ts: new Date(base + i * 3600 * 1000).toISOString(), play, watching, danmaku: Math.floor(play / 200), comment: Math.floor(play / 400), coin: Math.floor(play / 800), like: Math.floor(play / 300) });
  }
  return series;
}
function genFansSeries() {
  const base = Date.now() - 90 * 24 * 3600 * 1000;
  const series = [];
  let fans = 100000;
  for (let i = 0; i < 90; i++) {
    fans += Math.floor(Math.random() * 100 - 30);
    series.push({ ts: new Date(base + i * 24 * 3600 * 1000).toISOString(), fans });
  }
  return series;
}

// AUTH
app.post('/api/v1/auth/login', (req, res) => {
  const { username } = req.body || {};
  const user = users.find(u => u.username === username) || users[0];
  currentUser = user;
  res.json(ok({ token: 'dev-token', user }));
});
app.post('/api/v1/auth/logout', (req, res) => res.json(ok()));
app.get('/api/v1/auth/profile', (req, res) => res.json(ok(currentUser)));

// USERS
app.post('/api/v1/users/:id/password', (req, res) => res.json(ok()));

// ACCOUNTS
app.get('/api/v1/accounts', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.page_size || '20', 10);
  const start = (page - 1) * pageSize;
  const items = accounts.slice(start, start + pageSize);
  res.json(ok({ items, page, page_size: pageSize, total: accounts.length }));
});
app.post('/api/v1/accounts/cookie', (req, res) => {
  const { cookie } = req.body || {};
  if (!cookie || !cookie.includes('SESSDATA')) return res.json(err('invalid cookie'));
  const id = `a${Math.random().toString(36).slice(2, 8)}`;
  const acc = { id, uid: String(Math.floor(Math.random() * 900000 + 100000)), nickname: '新绑定账号', bind_method: 'cookie', status: 'valid', last_failures: 0, bound_at: now() };
  accounts.unshift(acc);
  res.json(ok(acc));
});
app.post('/api/v1/accounts/qrcode', (req, res) => {
  const session_id = `sess_${Math.random().toString(36).slice(2, 8)}`;
  qrSessions.set(session_id, { status: 'pending', createdAt: Date.now() });
  res.json(ok({ session_id, qr_url: 'https://via.placeholder.com/240x240?text=Scan+Me', expire_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), poll_interval_sec: 2 }));
});
app.get('/api/v1/accounts/qrcode/status', (req, res) => {
  const { session_id, stage } = req.query;
  const sess = qrSessions.get(session_id);
  if (!sess) return res.json(ok({ status: 'expired' }));
  // allow manual stage override for demo: pending -> scanned -> confirmed
  if (stage === 'scanned') sess.status = 'scanned';
  if (stage === 'confirmed') sess.status = 'confirmed';
  if (Date.now() - sess.createdAt > 2 * 60 * 1000) return res.json(ok({ status: 'expired' }));
  if (sess.status === 'confirmed') {
    const acc = { id: `a${Math.random().toString(36).slice(2, 8)}`, uid: String(Math.floor(Math.random() * 900000 + 100000)), nickname: '扫码绑定账号', bind_method: 'qrcode', status: 'valid', last_failures: 0, bound_at: now() };
    accounts.unshift(acc);
    return res.json(ok({ status: 'confirmed', account: acc }));
  }
  res.json(ok({ status: sess.status }));
});
app.post('/api/v1/accounts/:id/action', (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  const idx = accounts.findIndex(a => a.id === id);
  if (idx < 0) return res.json(err('not found'));
  if (action === 'validate') return res.json(ok());
  if (action === 'unbind') { accounts.splice(idx, 1); return res.json(ok()); }
  res.json(err('unsupported action'));
});

// TASKS
app.get('/api/v1/tasks', (req, res) => {
  const { page = '1', page_size = '20', keyword = '', type, author_uid, tags } = req.query;
  let items = tasks.slice();
  if (type) items = items.filter(t => t.type === type);
  if (author_uid) items = items.filter(t => t.type === 'author' && t.target_id === author_uid);
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    items = items.filter(t => (t.title || '').toLowerCase().includes(kw)
      || (t.nickname || '').toLowerCase().includes(kw)
      || t.target_id.toLowerCase().includes(kw));
  }
  if (tags) {
    const tagArr = String(tags).split(',').map(s => s.trim());
    items = items.filter(t => (t.tags || []).some(x => tagArr.includes(x)));
  }
  const p = parseInt(page, 10); const ps = parseInt(page_size, 10);
  const start = (p - 1) * ps;
  const pageItems = items.slice(start, start + ps);
  res.json(ok({ items: pageItems, page: p, page_size: ps, total: items.length }));
});
app.post('/api/v1/tasks', (req, res) => {
  const { type, target_id, account_id, strategy, deadline, tags } = req.body || {};
  if (!type || !target_id) return res.json(err('missing fields'));
  if (type === 'video' && !/^BV[0-9A-Za-z]+$/.test(target_id)) return res.json(err('invalid bv'));
  const id = `t_${type}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id, type, target_id, account_id: account_id || null, status: 'running', reason: null,
    strategy: strategy || { mode: 'smart' }, deadline: deadline || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    created_at: now(), updated_at: now(), tags: tags || [], latest_sample: {}, media: {}
  };
  if (type === 'video') {
    record.title = `新视频 ${target_id}`;
    record.media.cover_url = 'https://via.placeholder.com/320x180?text=Cover';
  } else {
    record.nickname = `博主 ${target_id}`;
    record.media.avatar_url = 'https://via.placeholder.com/120x120?text=Avatar';
  }
  tasks.unshift(record);
  res.json(ok(record));
});
app.get('/api/v1/tasks/:id', (req, res) => {
  const t = tasks.find(x => x.id === req.params.id);
  if (!t) return res.json(err('not found'));
  res.json(ok(t));
});
app.post('/api/v1/tasks/:id', (req, res) => {
  const { action } = req.body || {};
  const idx = tasks.findIndex(x => x.id === req.params.id);
  if (idx < 0) return res.json(err('not found'));
  if (action === 'delete') { tasks.splice(idx, 1); return res.json(ok()); }
  if (action === 'update') {
    const t = tasks[idx];
    const patch = { ...req.body };
    delete patch.action; delete patch.id;
    tasks[idx] = { ...t, ...patch, updated_at: now() };
    return res.json(ok());
  }
  res.json(err('unsupported action'));
});
app.post('/api/v1/tasks/batch', (req, res) => {
  const { action, selection } = req.body || {};
  if (!['enable', 'disable'].includes(action)) return res.json(err('unsupported action'));
  let targetIds = [];
  if (selection?.type === 'ids') targetIds = selection.ids || [];
  if (selection?.type === 'all') {
    // apply filters similar to GET /tasks
    const { keyword = '', type, author_uid, tags } = selection.filters || {};
    let items = tasks.slice();
    if (type) items = items.filter(t => t.type === type);
    if (author_uid) items = items.filter(t => t.type === 'author' && t.target_id === author_uid);
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      items = items.filter(t => (t.title || '').toLowerCase().includes(kw)
        || (t.nickname || '').toLowerCase().includes(kw)
        || t.target_id.toLowerCase().includes(kw));
    }
    if (tags) {
      const tagArr = String(tags).split(',').map(s => s.trim());
      items = items.filter(t => (t.tags || []).some(x => tagArr.includes(x)));
    }
    targetIds = items.map(i => i.id);
  }
  let success = 0; const failures = [];
  for (const id of targetIds) {
    const t = tasks.find(x => x.id === id);
    if (!t) { failures.push({ id, reason: 'not found' }); continue; }
    if (action === 'enable') t.status = 'running';
    if (action === 'disable') t.status = 'stopped';
    t.updated_at = now();
    success++;
  }
  res.json(ok({ success_count: success, failure_count: failures.length, failures }));
});

// METRICS
app.get('/api/v1/videos/:bv/metrics', (req, res) => {
  if (!/^BV[0-9A-Za-z]+$/.test(req.params.bv)) return res.json(err('invalid bv'));
  res.json(ok({ series: genVideoSeries() }));
});
app.get('/api/v1/videos/:bv/insights/daily', (req, res) => {
  if (!/^BV[0-9A-Za-z]+$/.test(req.params.bv)) return res.json(err('invalid bv'));
  const base = Date.now() - 14 * 24 * 3600 * 1000;
  const data = Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(base + i * 24 * 3600 * 1000).toISOString().slice(0, 10),
    completion_rate: Math.round((0.4 + Math.random() * 0.3) * 100) / 100,
    avg_watch_duration_sec: Math.round(60 + Math.random() * 200),
  }));
  res.json(ok(data));
});
app.get('/api/v1/authors/:uid/metrics', (req, res) => {
  res.json(ok({ series: genFansSeries() }));
});

// MEDIA
app.get('/api/v1/media/videos/:bv/cover', (req, res) => {
  res.json(ok({ url: 'https://via.placeholder.com/640x360?text=Cover' }));
});
app.get('/api/v1/media/authors/:uid/avatar', (req, res) => {
  res.json(ok({ url: 'https://via.placeholder.com/240x240?text=Avatar' }));
});
app.post('/api/v1/media/refresh', (req, res) => res.json(ok()));

// NOTIFICATIONS & ALERTS
let channels = { email: {}, dingtalk: {}, wecom: {}, webhook: {}, bark: {}, pushdeer: {}, onebot: {}, telegram: {} };
let alertRules = new Map(); // uid -> rule
app.get('/api/v1/notifications/channels', (req, res) => res.json(ok(channels)));
app.post('/api/v1/notifications/channels', (req, res) => {
  const { action, channels: c } = req.body || {};
  if (action !== 'save') return res.json(err('unsupported action'));
  channels = c || channels;
  res.json(ok());
});
app.get('/api/v1/alerts/authors/:uid', (req, res) => {
  res.json(ok(alertRules.get(req.params.uid) || { enabled: false, mode: 'absolute', threshold: 1000, window_hours: 24 }));
});
app.post('/api/v1/alerts/authors/:uid', (req, res) => {
  const { action } = req.body || {};
  if (action === 'save') { alertRules.set(req.params.uid, req.body.rule || {}); return res.json(ok()); }
  if (action === 'disable') { alertRules.set(req.params.uid, { enabled: false }); return res.json(ok()); }
  res.json(err('unsupported action'));
});

// LOGS
app.get('/api/v1/logs', (req, res) => {
  const nowTs = new Date();
  res.json(ok([
    { ts: nowTs.toISOString(), level: 'INFO', source: 'tasks', message: 'scheduled 10 tasks' },
    { ts: new Date(nowTs - 60000).toISOString(), level: 'WARNING', source: 'accounts', message: 'auth failed (count=3)' },
    { ts: new Date(nowTs - 120000).toISOString(), level: 'DEBUG', source: 'collector', message: 'GET /video stats ok' },
  ]));
});
app.get('/api/v1/logs/download', (req, res) => {
  res.json(ok({ url: 'https://example.com/logs/2025-11-28.txt' }));
});

// SETTINGS
let settings = { min_interval_min: 10, max_fixed_interval_day: 1, max_retries: 3, page_size_default: 20, timezone: 'Asia/Shanghai', users };
app.get('/api/v1/settings', (req, res) => res.json(ok(settings)));
app.post('/api/v1/settings', (req, res) => {
  const { action, settings: s } = req.body || {};
  if (action !== 'save') return res.json(err('unsupported action'));
  settings = { ...settings, ...s };
  res.json(ok());
});

app.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});


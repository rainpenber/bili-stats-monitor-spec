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
let defaultAccountId = 'a1';

// QR login sessions
const qrSessions = new Map(); // session_id -> { status, createdAt }

// Tasks dataset（仅展示）
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

// ------- Simple metrics generators -------
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

// ------- AUTH -------
app.post('/api/v1/auth/login', (req, res) => {
  const { username } = req.body || {};
  const user = users.find(u => u.username === username) || users[0];
  currentUser = user;
  res.json(ok({ token: 'dev-token', user }));
});
app.post('/api/v1/auth/logout', (req, res) => res.json(ok()));
app.get('/api/v1/auth/profile', (req, res) => res.json(ok(currentUser)));

// ------- USERS -------
app.post('/api/v1/users/:id/password', (req, res) => res.json(ok()));

// ------- ACCOUNTS -------
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
app.get('/api/v1/accounts/default', (req, res) => {
  res.json(ok({ id: defaultAccountId }))
});
app.post('/api/v1/accounts/default', (req, res) => {
  const { id } = req.body || {}
  if (!accounts.find(a => a.id === id)) return res.json(err('account not found'))
  defaultAccountId = id
  res.json(ok())
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

// ------- LOOKUP -------
app.post('/api/v1/lookup', (req, res) => {
  const { type, bv, url, uid, profile_url } = req.body || {}
  if (type === 'video') {
    const bvid = bv || ((url || '').match(/BV[0-9A-Za-z]+/) || [])[0] || `BV${Math.random().toString(36).slice(2,10)}`
    return res.json(ok({
      type: 'video',
      bv: bvid,
      title: `示例视频标题 ${bvid.slice(-4)}`,
      cover_url: 'https://via.placeholder.com/320x180?text=Cover',
      author_uid: String(Math.floor(Math.random()*900000+100000)),
      author_nickname: '示例UP主',
      desc: '这是一个示例视频简介，供筛选演示使用。'
    }))
  }
  if (type === 'author') {
    const uidVal = uid || ((profile_url || '').match(/space\.bilibili\.com\/(\d+)/) || [])[1] || String(Math.floor(Math.random()*900000+100000))
    return res.json(ok({
      type: 'author',
      uid: uidVal,
      nickname: `示例博主${uidVal.slice(-2)}`,
      avatar_url: 'https://via.placeholder.com/120x120?text=Avatar',
      fans: Math.floor(Math.random()*300000+1000)
    }))
  }
  return res.json(err('unsupported type'))
})

// ------- Author videos list -------
app.get('/api/v1/authors/:uid/videos', (req, res) => {
  const { uid } = req.params
  const page = parseInt(req.query.page || '1', 10)
  const pageSize = parseInt(req.query.page_size || '10', 10)
  const q = String(req.query.q || '').toLowerCase()
  const total = 36
  const start = (page - 1) * pageSize
  const end = Math.min(total, start + pageSize)
  let items = []
  for (let i = start; i < end; i++) {
    const bv = `BV${Math.random().toString(36).slice(2,10)}${i}`
    items.push({ id: bv, bv, title: `视频 ${i+1}`, coverUrl: 'https://via.placeholder.com/320x180?text=Cover', published_at: new Date(Date.now()-i*86400000).toISOString(), desc: `示例视频 ${i+1} 简介文本` })
  }
  if (q) {
    items = items.filter(v => (v.title||'').toLowerCase().includes(q) || (v.bv||'').toLowerCase().includes(q) || (v.desc||'').toLowerCase().includes(q))
  }
  const has_more = end < total
  res.json(ok({ items, page, page_size: pageSize, total, has_more }))
})

// ------- TASKS -------
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
  const { type, target_id, strategy, deadline, tags, title, nickname } = req.body || {};
  if (!type || !target_id) return res.json(err('missing fields'));
  const id = `t_${type}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id, type, target_id, account_id: defaultAccountId, status: 'running', reason: null,
    strategy: strategy || { mode: type==='video' ? 'smart' : 'fixed', value: 1, unit: 'day' }, deadline: deadline || new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    created_at: now(), updated_at: now(), tags: tags || [], latest_sample: {}, media: {}
  };
  if (type === 'video') {
    record.title = title || `新视频 ${target_id}`;
    record.media.cover_url = 'https://via.placeholder.com/320x180?text=Cover';
  } else {
    record.nickname = nickname || `博主 ${target_id}`;
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

// ------- NOTIFICATIONS -------
let channels = { email: {}, dingtalk: {}, wecom: {}, webhook: {}, bark: {}, pushdeer: {}, onebot: {}, telegram: {} };
app.get('/api/v1/notifications/channels', (req, res) => res.json(ok(channels)));
app.post('/api/v1/notifications/channels', (req, res) => {
  const { action, channels: c } = req.body || {};
  if (action !== 'save') return res.json(err('unsupported action'));
  channels = c || channels;
  res.json(ok());
});
app.post('/api/v1/notifications/test', (req, res) => {
  res.json(ok())
});

// Notification Rules (low-fi)
let notifyRules = [
  { id: 'r1', name: '任务停用/鉴权失败', enabled: true, triggers: ['task_stopped','auth_failed'], channels: ['email'] },
]
const RULE_TRIGGERS = ['task_stopped','auth_failed','low_growth']
app.get('/api/v1/notifications/rules', (req, res) => {
  res.json(ok({ items: notifyRules, triggers: RULE_TRIGGERS, channels: Object.keys(channels) }))
})
app.post('/api/v1/notifications/rules', (req, res) => {
  const { action, rule, id } = req.body || {}
  if (action === 'save') {
    if (!rule) return res.json(err('missing rule'))
    if (rule.id) {
      const idx = notifyRules.findIndex(r => r.id === rule.id)
      if (idx >= 0) notifyRules[idx] = { ...notifyRules[idx], ...rule }
      else notifyRules.push({ ...rule })
    } else {
      const newId = `r${Math.random().toString(36).slice(2,8)}`
      notifyRules.push({ ...rule, id: newId })
    }
    return res.json(ok())
  }
  if (action === 'delete') {
    const idx = notifyRules.findIndex(r => r.id === id)
    if (idx < 0) return res.json(err('not found'))
    notifyRules.splice(idx,1)
    return res.json(ok())
  }
  res.json(err('unsupported action'))
})

// ------- LOGS -------
// Synthetic logs dataset (rolling last 15 days)
const LOG_SOURCES = ['tasks', 'accounts', 'collector', 'scheduler', 'api', 'web'];
function buildLogsDataset() {
  const out = [];
  const start = Date.now() - 15 * 24 * 3600 * 1000;
  const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
  for (let i = 0; i < 15 * 48; i++) { // per 30 mins
    const ts = new Date(start + i * 30 * 60 * 1000).toISOString();
    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)];
    const message = `${source} ${level} message #${i}`;
    out.push({ ts, level, source, message });
  }
  return out;
}
let logsDataset = buildLogsDataset();

app.get('/api/v1/logs', (req, res) => {
  let { date_from, date_to, levels, sources, keyword, page = '1', page_size = '50', sort = 'ts_desc' } = req.query;
  let items = logsDataset.slice();
  if (date_from) {
    const t = new Date(date_from).getTime();
    items = items.filter(x => new Date(x.ts).getTime() >= t);
  }
  if (date_to) {
    const t = new Date(date_to).getTime();
    items = items.filter(x => new Date(x.ts).getTime() <= t + 24 * 3600 * 1000 - 1);
  }
  if (levels) {
    const lv = String(levels).split(',').map(s => s.trim().toUpperCase());
    items = items.filter(x => lv.includes(x.level));
  }
  if (sources) {
    const ss = String(sources).split(',').map(s => s.trim());
    items = items.filter(x => ss.includes(x.source));
  }
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    items = items.filter(x => x.message.toLowerCase().includes(kw));
  }
  items.sort((a, b) => (sort === 'ts_asc' ? new Date(a.ts) - new Date(b.ts) : new Date(b.ts) - new Date(a.ts)));
  const p = parseInt(page, 10); const ps = parseInt(page_size, 10);
  const start = (p - 1) * ps;
  const pageItems = items.slice(start, start + ps);
  res.json(ok({ items: pageItems, page: p, page_size: ps, total: items.length, sources: LOG_SOURCES }));
});
app.get('/api/v1/logs/download', (req, res) => {
  // Simply echo back a composed URL for demo
  const qs = new URLSearchParams(req.query).toString();
  res.json(ok({ url: `https://example.com/mock-logs.txt?${qs}` }));
});

// ------- SETTINGS -------
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

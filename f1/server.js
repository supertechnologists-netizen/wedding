'use strict';
/**
 * ANNA & ANDRII — Wedding Grand Prix. Zero-dependency server (Node >= 22.5).
 * Storage: SQLite (node:sqlite) in ./data/wedding.db
 * Env: PORT (3000), ADMIN_PASSWORD (required in production), SECRET (cookie signing), DATA_DIR
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'grandprix2027';
if (!process.env.ADMIN_PASSWORD) console.warn('⚠  ADMIN_PASSWORD не задано — використовується пароль за замовчуванням. Задайте його перед публікацією!');
const secretFile = path.join(DATA_DIR, '.secret');
let SECRET = process.env.SECRET;
if (!SECRET) {
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  SECRET = fs.readFileSync(secretFile, 'utf8');
}

/* ---------------- DB ---------------- */
const db = new DatabaseSync(path.join(DATA_DIR, 'wedding.db'));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS guests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  invited INTEGER NOT NULL DEFAULT 1,      -- 1 = added by couple, 0 = came via open link
  max_party INTEGER NOT NULL DEFAULT 2,
  attending INTEGER,                        -- NULL = no answer, 1 = yes, 0 = no
  plus_one INTEGER NOT NULL DEFAULT 0,
  plus_name TEXT NOT NULL DEFAULT '',
  diet TEXT NOT NULL DEFAULT '',
  drinks TEXT NOT NULL DEFAULT '[]',
  phone TEXT NOT NULL DEFAULT '',
  responded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wishes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER, name TEXT NOT NULL, message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const DEFAULTS = {
  groom: 'Андрій', bride: 'Аня',
  eventDate: '2027-06-19T15:00:00',
  venueName: 'Ресторан «Pit Lane»',
  venueAddress: 'вул. Прикладна, 1, Київ',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kyiv',
  rsvpDeadline: '2027-05-19',
  contactPhone: '',
  musicUrl: '',
  routeText: 'Просимо не запізнюватися: для вас підготовлено програму, яку було б шкода пропустити. Їдьте за машинкою — вона знає дорогу.',
  giftTitle: 'Замість квітів',
  giftText: 'Найкращий подарунок для нас — ваша присутність. Якщо захочете подарувати щось ще, ми зібрали невеликий список побажань. Квіти, будь ласка, залиште саду: вони все одно зав’януть.',
  giftUrl: '', giftButton: 'Обрати подарунок',
  gifts: [{ title: 'Подорож', image: '' }, { title: 'Вечеря удвох', image: '' }, { title: 'Враження', image: '' }, { title: 'Внесок у мрію', image: '' }],
  heroPhoto: '', bridePhoto: '', groomPhoto: '', couplePhoto: '',
  brideBio: 'Аня — наш штурман: веде маршрутом, знає кожен поворот і завжди знаходить найкращу дорогу. Любить подорожі, каву на світанку і спонтанні поїздки.',
  groomBio: 'Андрій — наш пілот: швидкий розум, тверда рука і спокій на будь-якому віражі. Любить швидкість, музику і рідко пропускає Гран-прі.',
  story: 'Ми зустрілися на найважливішому колі свого життя — і вирішили більше не робити піт-стопів поодинці. Тепер на старті нашої головної гонки хочемо бачити вас.',
  dressText: 'Будемо раді бачити вас у кольорах нашого свята: чорний, червоний і м’які природні відтінки. Просимо залишити білий колір нареченій.',
  dressColors: [
    { hex: '#1c1b1a', name: 'Чорний' }, { hex: '#d6001c', name: 'Червоний' }, { hex: '#f4efe6', name: 'Айворі' },
    { hex: '#c9b79c', name: 'Пісочний' }, { hex: '#7b1e2b', name: 'Бордо' }, { hex: '#8a8f98', name: 'Сталевий' }
  ],
  gallery: [
    { url: '', caption: 'Pole position' }, { url: '', caption: 'Перше коло' }, { url: '', caption: 'Піт-стоп' },
    { url: '', caption: 'Поворот долі' }, { url: '', caption: 'Спільний фініш' }, { url: '', caption: 'Подіум' }
  ],
  dressWomen: 'Вечірні сукні, костюми, акценти червоного. Зручне взуття для танців — піт-стоп на паркеті гарантовано.',
  dressMen: 'Костюм або смокінг, біла сорочка, червоний або чорний аксесуар. Краватка — на ваш смак.',
  schedule: [
    { time: '14:30', title: 'Збір гостей', text: 'Паддок відкрито: вітальний напій, фото та зустріч з друзями.' },
    { time: '15:00', title: 'Церемонія', text: 'Урочиста реєстрація — головний старт нашого дня.' },
    { time: '17:00', title: 'Вечеря', text: 'Святкова вечеря, тости та перші поздоровлення.' },
    { time: '20:00', title: 'Вечірка', text: 'Танці, музика і феєрверк емоцій до фінального прапора.' }
  ],
  drinks: ['Червоне вино', 'Біле вино', 'Ігристе вино', 'Шампанське', 'Горілка', 'Коньяк', 'Віскі', 'Ром', 'Не вживаю алкоголь']
};
const getSettings = () => {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key,value FROM settings').all()) {
    try { out[r.key] = JSON.parse(r.value); } catch { /* ignore */ }
  }
  return out;
};
const setSetting = (k, v) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, JSON.stringify(v));

/* ---------------- helpers ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
const json = (res, code, obj, headers = {}) => { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); res.end(b); };
const readBody = (req, limit = 8e6) => new Promise((ok, no) => {
  let n = 0; const ch = [];
  req.on('data', c => { n += c.length; if (n > limit) { no(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } else ch.push(c); });
  req.on('end', () => ok(Buffer.concat(ch).toString('utf8')));
  req.on('error', no);
});
const readJSON = async (req, limit) => { const t = await readBody(req, limit); try { return t ? JSON.parse(t) : {}; } catch { throw Object.assign(new Error('bad json'), { code: 400 }); } };
const str = (v, max = 300) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const newCode = () => crypto.randomBytes(4).toString('hex'); // 8 hex chars

const sign = (payload) => { const p = Buffer.from(payload).toString('base64url'); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('base64url'); };
const verify = (tok) => {
  if (!tok || !tok.includes('.')) return null;
  const [p, s] = tok.split('.');
  const exp = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  if (s.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp))) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.exp > Date.now() ? d : null; } catch { return null; }
};
const cookie = (req, name) => (req.headers.cookie || '').split(/;\s*/).map(c => c.split('=')).find(c => c[0] === name)?.[1];
const isAdmin = (req) => !!verify(cookie(req, 'gp_admin'));
const safeEq = (a, b) => { const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest(); return crypto.timingSafeEqual(x, y); };

// simple in-memory rate limit
const hits = new Map();
const limited = (key, max, windowMs) => {
  const now = Date.now(); const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now); hits.set(key, arr); return arr.length > max;
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();
const ip = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

const guestPublic = (g) => g && ({ code: g.code, name: g.name, maxParty: g.max_party, attending: g.attending, plusOne: !!g.plus_one, plusName: g.plus_name, diet: g.diet, drinks: JSON.parse(g.drinks || '[]'), responded: !!g.responded_at });
const guestAdmin = (g) => ({ id: g.id, code: g.code, name: g.name, invited: !!g.invited, maxParty: g.max_party, attending: g.attending, plusOne: !!g.plus_one, plusName: g.plus_name, diet: g.diet, drinks: JSON.parse(g.drinks || '[]'), phone: g.phone, respondedAt: g.responded_at, createdAt: g.created_at });

const publicSettings = () => { const s = getSettings(); return s; };

/* ---------------- API ---------------- */
async function api(req, res, url) {
  const p = url.pathname, m = req.method;

  // ----- public -----
  if (p === '/api/site' && m === 'GET') {
    const code = str(url.searchParams.get('g'), 40);
    const g = code ? db.prepare('SELECT * FROM guests WHERE code=?').get(code) : null;
    return json(res, 200, { settings: publicSettings(), guest: guestPublic(g) });
  }
  if (p === '/api/rsvp' && m === 'POST') {
    if (limited('rsvp:' + ip(req), 20, 3600e3)) return json(res, 429, { error: 'Забагато спроб. Спробуйте пізніше.' });
    const b = await readJSON(req, 50e3);
    const name = str(b.name, 120);
    if (name.length < 2) return json(res, 400, { error: 'Вкажіть ім’я та прізвище.' });
    if (b.attending !== true && b.attending !== false) return json(res, 400, { error: 'Оберіть, чи будете ви присутні.' });
    const allowed = new Set(getSettings().drinks);
    const drinks = (Array.isArray(b.drinks) ? b.drinks : []).map(d => str(d, 60)).filter(d => allowed.has(d)).slice(0, 20);
    const attending = b.attending ? 1 : 0;
    const plus = attending && b.plusOne ? 1 : 0;
    const row = { name, attending, plus, plusName: plus ? str(b.plusName, 120) : '', diet: attending ? str(b.diet, 500) : '', drinks: JSON.stringify(attending ? drinks : []), phone: str(b.phone, 40) };
    let g = b.code ? db.prepare('SELECT * FROM guests WHERE code=?').get(str(b.code, 40)) : null;
    if (g) {
      if (plus && g.max_party < 2) row.plus = 0, row.plusName = '';
      db.prepare(`UPDATE guests SET name=?,attending=?,plus_one=?,plus_name=?,diet=?,drinks=?,phone=?,responded_at=datetime('now') WHERE id=?`)
        .run(row.name, row.attending, row.plus, row.plusName, row.diet, row.drinks, row.phone, g.id);
    } else {
      const code = newCode();
      const r = db.prepare(`INSERT INTO guests(code,name,invited,attending,plus_one,plus_name,diet,drinks,phone,responded_at) VALUES(?,?,0,?,?,?,?,?,?,datetime('now'))`)
        .run(code, row.name, row.attending, row.plus, row.plusName, row.diet, row.drinks, row.phone);
      g = db.prepare('SELECT * FROM guests WHERE id=?').get(r.lastInsertRowid);
    }
    return json(res, 200, { ok: true, guest: guestPublic(db.prepare('SELECT * FROM guests WHERE id=?').get(g.id)) });
  }
  if (p === '/api/wish' && m === 'POST') {
    if (limited('wish:' + ip(req), 10, 3600e3)) return json(res, 429, { error: 'Забагато спроб. Спробуйте пізніше.' });
    const b = await readJSON(req, 20e3);
    const name = str(b.name, 100), message = str(b.message, 2000);
    if (name.length < 2 || message.length < 2) return json(res, 400, { error: 'Заповніть ім’я та побажання.' });
    const g = b.code ? db.prepare('SELECT id FROM guests WHERE code=?').get(str(b.code, 40)) : null;
    db.prepare('INSERT INTO wishes(guest_id,name,message) VALUES(?,?,?)').run(g?.id ?? null, name, message);
    return json(res, 200, { ok: true });
  }

  // ----- admin auth -----
  if (p === '/api/admin/login' && m === 'POST') {
    if (limited('login:' + ip(req), 8, 15 * 60e3)) return json(res, 429, { error: 'Забагато спроб. Зачекайте 15 хвилин.' });
    const b = await readJSON(req, 5e3);
    if (!safeEq(str(b.password, 200), ADMIN_PASSWORD)) return json(res, 401, { error: 'Невірний пароль.' });
    const tok = sign(JSON.stringify({ exp: Date.now() + 7 * 864e5 }));
    const secure = (req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
    return json(res, 200, { ok: true }, { 'Set-Cookie': `gp_admin=${tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 86400}${secure}` });
  }
  if (p === '/api/admin/logout' && m === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': 'gp_admin=; HttpOnly; Path=/; Max-Age=0' });
  if (p === '/api/admin/me') return json(res, 200, { admin: isAdmin(req) });

  if (!p.startsWith('/api/admin/')) return json(res, 404, { error: 'not found' });
  if (!isAdmin(req)) return json(res, 401, { error: 'Потрібна авторизація.' });
  // CSRF guard for state changes (SameSite=Strict + same-origin check)
  if (m !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'forbidden' });

  // ----- admin data -----
  if (p === '/api/admin/data' && m === 'GET') {
    const guests = db.prepare('SELECT * FROM guests ORDER BY invited DESC, name COLLATE NOCASE').all().map(guestAdmin);
    const wishes = db.prepare('SELECT * FROM wishes ORDER BY id DESC').all();
    return json(res, 200, { guests, wishes, settings: getSettings(), stats: stats(guests) });
  }
  if (p === '/api/admin/guests' && m === 'POST') {
    const b = await readJSON(req, 20e3);
    const names = (Array.isArray(b.names) ? b.names : [b.name]).map(n => str(n, 120)).filter(Boolean);
    if (!names.length) return json(res, 400, { error: 'Вкажіть ім’я.' });
    const maxParty = Math.min(10, Math.max(1, +b.maxParty || 2));
    const ins = db.prepare('INSERT INTO guests(code,name,invited,max_party) VALUES(?,?,1,?)');
    for (const n of names) ins.run(newCode(), n, maxParty);
    return json(res, 200, { ok: true, added: names.length });
  }
  let mm;
  if ((mm = p.match(/^\/api\/admin\/guests\/(\d+)$/))) {
    const id = +mm[1];
    if (m === 'DELETE') { db.prepare('DELETE FROM guests WHERE id=?').run(id); return json(res, 200, { ok: true }); }
    if (m === 'PUT') {
      const b = await readJSON(req, 20e3);
      const g = db.prepare('SELECT * FROM guests WHERE id=?').get(id);
      if (!g) return json(res, 404, { error: 'not found' });
      const attending = b.attending === true ? 1 : b.attending === false ? 0 : null;
      const allowed = new Set(getSettings().drinks);
      const drinks = (Array.isArray(b.drinks) ? b.drinks : JSON.parse(g.drinks)).map(d => str(d, 60)).filter(d => allowed.has(d));
      db.prepare(`UPDATE guests SET name=?,max_party=?,attending=?,plus_one=?,plus_name=?,diet=?,drinks=?,phone=?,responded_at=CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(responded_at,datetime('now')) END WHERE id=?`)
        .run(str(b.name, 120) || g.name, Math.min(10, Math.max(1, +b.maxParty || g.max_party)), attending, b.plusOne ? 1 : 0, str(b.plusName, 120), str(b.diet, 500), JSON.stringify(drinks), str(b.phone, 40), attending, id);
      return json(res, 200, { ok: true });
    }
  }
  if ((mm = p.match(/^\/api\/admin\/wishes\/(\d+)$/)) && m === 'DELETE') { db.prepare('DELETE FROM wishes WHERE id=?').run(+mm[1]); return json(res, 200, { ok: true }); }

  if (p === '/api/admin/settings' && m === 'PUT') {
    const b = await readJSON(req, 100e3);
    const strKeys = ['groom', 'bride', 'eventDate', 'venueName', 'venueAddress', 'mapUrl', 'rsvpDeadline', 'contactPhone', 'musicUrl', 'heroPhoto', 'bridePhoto', 'groomPhoto', 'couplePhoto', 'brideBio', 'groomBio', 'story', 'dressText', 'dressWomen', 'dressMen', 'routeText', 'giftTitle', 'giftText', 'giftUrl', 'giftButton'];
    for (const k of strKeys) if (k in b) setSetting(k, str(b[k], 3000));
    if (Array.isArray(b.drinks)) setSetting('drinks', [...new Set(b.drinks.map(d => str(d, 60)).filter(Boolean))].slice(0, 40));
    if (Array.isArray(b.dressColors)) setSetting('dressColors', b.dressColors.map(c => typeof c === 'string' ? { hex: str(c, 9), name: '' } : { hex: str(c?.hex, 9), name: str(c?.name, 40) }).filter(c => /^#[0-9a-f]{3,8}$/i.test(c.hex)).slice(0, 12));
    if (Array.isArray(b.gifts)) setSetting('gifts', b.gifts.map(g => ({ title: str(g?.title, 60), image: str(g?.image, 500) })).filter(g => g.title || g.image).slice(0, 12));
    if (Array.isArray(b.gallery)) setSetting('gallery', b.gallery.map(g => ({ url: str(g?.url, 500), caption: str(g?.caption, 60) })).filter(g => g.url || g.caption).slice(0, 12));
    if (Array.isArray(b.schedule)) setSetting('schedule', b.schedule.slice(0, 12).map(s => ({ time: str(s.time, 10), title: str(s.title, 80), text: str(s.text, 400) })).filter(s => s.title));
    return json(res, 200, { ok: true, settings: getSettings() });
  }
  if (p === '/api/admin/upload' && m === 'POST') {
    const b = await readJSON(req, 8e6);
    const mt = /^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/s.exec(b.data || '');
    if (!mt) return json(res, 400, { error: 'Підтримуються PNG, JPEG, WEBP, GIF.' });
    const buf = Buffer.from(mt[3], 'base64');
    if (buf.length > 5.5e6) return json(res, 413, { error: 'Файл завеликий (макс. 5 МБ).' });
    const ext = mt[2] === 'jpeg' ? 'jpg' : mt[2];
    const name = crypto.randomBytes(8).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return json(res, 200, { ok: true, url: '/uploads/' + name });
  }
  if (p === '/api/admin/export.csv' && m === 'GET') {
    const guests = db.prepare('SELECT * FROM guests ORDER BY invited DESC, name COLLATE NOCASE').all().map(guestAdmin);
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['Ім’я', 'Статус', 'Запрошений молодятами', 'Супутник', 'Ім’я супутника', 'Напої', 'Харчові побажання', 'Телефон', 'Особисте посилання', 'Дата відповіді'];
    const base = (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host;
    const rows = guests.map(g => [g.name, g.attending === 1 ? 'Прийде' : g.attending === 0 ? 'Відмова' : 'Без відповіді', g.invited ? 'так' : 'ні', g.plusOne ? 'так' : 'ні', g.plusName, g.drinks.join('; '), g.diet, g.phone, `${base}/?g=${g.code}`, g.respondedAt || '']);
    const csv = '﻿' + [head, ...rows].map(r => r.map(q).join(';')).join('\r\n');
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="wedding-guests.csv"' });
    return res.end(csv);
  }
  return json(res, 404, { error: 'not found' });
}

function stats(guests) {
  const yes = guests.filter(g => g.attending === 1), no = guests.filter(g => g.attending === 0), none = guests.filter(g => g.attending === null);
  const drinks = {};
  for (const g of yes) for (const d of g.drinks) drinks[d] = (drinks[d] || 0) + 1;
  return {
    total: guests.length, invited: guests.filter(g => g.invited).length, yes: yes.length, no: no.length, pending: none.length,
    people: yes.length + yes.filter(g => g.plusOne).length,
    plusOnes: yes.filter(g => g.plusOne).length,
    diet: yes.filter(g => g.diet).length,
    drinks
  };
}

/* ---------------- static ---------------- */
function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache || 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';
    if (rel === '/' || rel.startsWith('/i/')) rel = '/index.html';
    if (rel.startsWith('/uploads/')) return serveFile(req, res, path.join(UPLOADS, path.basename(rel)), 'public, max-age=86400');
    const file = path.normalize(path.join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
    if (rel === '/admin.html') res.setHeader('X-Robots-Tag', 'noindex');
    return serveFile(req, res, file);
  } catch (e) {
    if (!res.headersSent) json(res, e.code === 413 || e.code === 400 ? e.code : 500, { error: e.code === 413 ? 'Завеликий запит' : e.code === 400 ? 'Некоректний запит' : 'Помилка сервера' });
    if (!e.code) console.error(e);
  }
});
server.listen(PORT, () => console.log(`Wedding Grand Prix → http://localhost:${PORT}  (admin: /admin)`));

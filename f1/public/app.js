'use strict';
(function () {
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('reduced');
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
  const sess = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* */ } } };

  let S = {}, guest = null;
  const urlCode = new URLSearchParams(location.search).get('g') || (location.pathname.match(/^\/i\/([\w-]+)/) || [])[1] || '';

  /* =============== AUDIO =============== */
  const Audio_ = (() => {
    let ctx, master, sfxOn = false, musicOn = false, musicTimer, step = 0, nextT = 0, el;
    const ensure = () => {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const tone = (f, dur = .12, vol = .05, type = 'square', when = 0, f2) => {
      if (!sfxOn || !ensure()) return;
      const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
    };
    const rev = () => {
      if (!sfxOn || !ensure()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(380, t + .55); o.frequency.exponentialRampToValueAtTime(120, t + .95);
      f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + .5); f.frequency.exponentialRampToValueAtTime(400, t + .95);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + 1);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 1.05);
    };
    const noise = (t, dur, vol, hp) => {
      const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(musicGain); s.start(t);
    };
    let musicGain;
    const bass = [55, 55, 87.31, 87.31, 65.41, 65.41, 98, 98]; // A F C G (per half bar)
    const arp = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
    const schedule = () => {
      const bpm = 126, sp = 60 / bpm / 4;
      while (nextT < ctx.currentTime + .15) {
        const s = step % 16, bar = Math.floor(step / 16) % 4;
        if (s % 4 === 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, nextT); o.frequency.exponentialRampToValueAtTime(40, nextT + .14); g.gain.setValueAtTime(.9, nextT); g.gain.exponentialRampToValueAtTime(.001, nextT + .2); o.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + .22); }
        if (s % 4 === 2) noise(nextT, .06, .18, 6000);
        if (s % 2 === 0) { // bass 8th
          const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = [55, 87.31 / 2, 65.41 / 2, 98 / 2][bar]; f.type = 'lowpass'; f.frequency.value = 420;
          g.gain.setValueAtTime(.45, nextT); g.gain.exponentialRampToValueAtTime(.001, nextT + sp * 1.8); o.connect(f); f.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + sp * 2);
        }
        { // 16th arpeggio lead
          const n = arp[bar][s % 3], o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = n * 2;
          g.gain.setValueAtTime(.10, nextT); g.gain.exponentialRampToValueAtTime(.001, nextT + sp * .9); o.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + sp);
        }
        nextT += sp; step++;
      }
    };
    const startMusic = () => {
      if (S.musicUrl) {
        el = el || Object.assign(new window.Audio(S.musicUrl), { loop: true, volume: .35 }); el.play().catch(() => { }); return;
      }
      if (!ensure()) return;
      if (!musicGain) { musicGain = ctx.createGain(); musicGain.gain.value = .13; musicGain.connect(master); }
      step = 0; nextT = ctx.currentTime + .05; clearInterval(musicTimer); musicTimer = setInterval(schedule, 40);
    };
    const stopMusic = () => { clearInterval(musicTimer); if (el) el.pause(); };
    return {
      setSfx(v) { sfxOn = v; if (v) ensure(); store.set('gp_sfx', v ? '1' : '0'); },
      setMusic(v) { musicOn = v; v ? startMusic() : stopMusic(); store.set('gp_music', v ? '1' : '0'); },
      get sfx() { return sfxOn; }, get music() { return musicOn; },
      beep: () => tone(520, .16, .05), go: () => tone(220, .6, .07, 'sawtooth', 0, 900), tick: () => tone(1400, .03, .012, 'sine'), stop: () => { tone(660, .1, .04); tone(990, .14, .04, 'square', .09); }, rev,
      finish: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, .05, 'triangle', i * .14))
    };
  })();
  const bindToggle = (btn, get, set) => btn.addEventListener('click', () => { set(!get()); btn.setAttribute('aria-pressed', get()); if (btn.id === 'btnSfx' && get()) Audio_.stop(); });
  bindToggle($('#btnMusic'), () => Audio_.music, v => Audio_.setMusic(v));
  bindToggle($('#btnSfx'), () => Audio_.sfx, v => Audio_.setSfx(v));
  if (store.get('gp_sfx') === '1') { /* needs a gesture; show state off until user clicks */ }
  document.addEventListener('mouseover', e => { const b = e.target.closest('[data-sfx],.btn,.choice label,.chips label'); if (b && !b.contains(e.relatedTarget)) Audio_.tick(); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-sfx="rev"]'); if (b) Audio_.rev(); });

  /* =============== helpers =============== */
  const fmtDate = (d, o) => new Intl.DateTimeFormat('uk-UA', o).format(d);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* =============== INTRO =============== */
  function runIntro() {
    const intro = $('#intro'), cols = $$('.lights .col'), txt = $('#introText');
    let done = false, timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finish = (instant) => {
      if (done) return; done = true; timers.forEach(clearTimeout);
      sess.set('gp_seen', '1');
      if (instant) { intro.remove(); document.body.classList.remove('intro-on'); document.body.classList.add('go'); return; }
      intro.classList.add('out'); document.body.classList.add('go'); document.body.classList.remove('intro-on');
      setTimeout(() => intro.remove(), 1200);
    };
    $('#skipIntro').addEventListener('click', () => finish(false));
    if (reduced || location.hash.length > 1 || sess.get('gp_seen')) return finish(true);
    cols.forEach((c, i) => later(() => { c.classList.add('on'); Audio_.beep(); txt.textContent = (i + 1) + ' / 5'; }, 700 + i * 750));
    const hold = 700 + 5 * 750 + 900 + Math.random() * 900;
    later(() => { cols.forEach(c => c.classList.remove('on')); txt.textContent = 'LIGHTS OUT AND AWAY WE GO!'; txt.classList.add('go'); Audio_.go(); }, hold);
    later(() => finish(false), hold + 900);
  }

  /* =============== CONTENT =============== */
  function fill() {
    const bride = (S.bride || 'Аня'), groom = (S.groom || 'Андрій');
    $('#nBride').textContent = bride.toUpperCase().replace('АНЯ', 'ANNA'); $('#nGroom').textContent = groom.toUpperCase().replace('АНДРІЙ', 'ANDRII');
    const nB = $('#nBride').textContent, nG = $('#nGroom').textContent;
    document.title = `${nB} & ${nG} · Wedding Grand Prix`;
    const d = new Date(S.eventDate);
    const valid = !isNaN(d);
    const dateStr = valid ? fmtDate(d, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    $('#heroDate').textContent = dateStr; $('#finDate').textContent = dateStr + (S.venueName ? ' · ' + S.venueName : '');
    $('#heroVenue').textContent = S.venueName || '';
    $('#vDate').textContent = valid ? fmtDate(d, { day: 'numeric', month: 'long' }) : '';
    $('#vWeekday').textContent = valid ? cap(fmtDate(d, { weekday: 'long' })) + ', ' + d.getFullYear() : '';
    $('#vTime').textContent = valid ? fmtDate(d, { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    $('#vName').textContent = S.venueName || ''; $('#vAddr').textContent = S.venueAddress || '';
    const map = $('#vMap'); if (S.mapUrl) map.href = S.mapUrl; else map.hidden = true;
    if (S.rsvpDeadline) { const dl = new Date(S.rsvpDeadline + 'T12:00:00'); $('#vDeadline').innerHTML = isNaN(dl) ? '' : `Підтвердіть участь до <b>${fmtDate(dl, { day: 'numeric', month: 'long' })}</b>`; }
    $('#story').textContent = S.story || '';
    for (const [id, bio, photo, name] of [['#dBride', S.brideBio, S.bridePhoto, bride], ['#dGroom', S.groomBio, S.groomPhoto, groom]]) {
      const el = $(id); $('.bio', el).textContent = bio || ''; $('h3', el).textContent = name;
      const ph = $('.photo', el); ph.dataset.ph = name.charAt(0);
      if (photo) { const img = new Image(); img.alt = name; img.loading = 'lazy'; img.src = photo; ph.prepend(img); }
    }
    if (S.couplePhoto) { const f = $('#couple'); $('img', f).src = S.couplePhoto; f.hidden = false; }
    if (S.heroPhoto) $('#heroPhoto').style.backgroundImage = `url("${S.heroPhoto.replace(/"/g, '%22')}")`;
    $('#dressText').textContent = S.dressText || ''; $('#dressW').textContent = S.dressWomen || ''; $('#dressM').textContent = S.dressMen || '';
    $('#swatches').innerHTML = (S.dressColors || []).map(c => `<div class="sw"><i style="background:${esc(c)}"></i><span>${esc(c)}</span></div>`).join('');
    $('#drinkChips').innerHTML = (S.drinks || []).map((x, i) => `<label><input type="checkbox" name="drink" value="${esc(x)}"><span>${esc(x)}</span></label>`).join('');
    if (guest) {
      const first = guest.name.split(' ')[0];
      $('#greet').innerHTML = `Вітаємо, <b>${esc(guest.name)}</b>! Для вас — персональне запрошення на старт.`;
      $('#rsvpLead').textContent = `${first}, дайте нам знати, чи будете ви на старті. Це займе хвилину.` + (guest.responded ? ' Ви вже відповіли — за потреби змініть відповідь.' : '');
    } else $('#greet').textContent = 'Вас запрошено на головну гонку нашого життя';
  }

  /* =============== COUNTDOWN =============== */
  function countdown() {
    const t = new Date(S.eventDate).getTime(); if (isNaN(t)) return;
    const els = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
    const tick = () => {
      let diff = t - Date.now();
      if (diff <= 0) { Object.values(els).forEach(e => e.textContent = '00'); $('#cdNote').textContent = 'Lights out! Гонка триває'; return; }
      const s = Math.floor(diff / 1000), p = n => String(n).padStart(2, '0');
      els.d.textContent = Math.floor(s / 86400); els.h.textContent = p(Math.floor(s % 86400 / 3600)); els.m.textContent = p(Math.floor(s % 3600 / 60)); els.s.textContent = p(s % 60);
      $('#cdNote').textContent = 'До старту гонки залишилось';
    };
    tick(); setInterval(tick, 1000);
  }

  /* =============== TRACK (circuit map) =============== */
  const Track = (() => {
    const svg = $('#trackSvg'), NS = 'http://www.w3.org/2000/svg';
    const CFG = {
      land: { vb: [1000, 520], plate: [1, 1], d: 'M300 440H690C770 440 820 420 835 375C850 330 815 300 765 292L650 275C600 267 590 230 630 205L725 150C775 120 770 75 720 68L560 58C500 52 470 88 440 118C410 148 380 150 350 120C320 90 270 70 220 85C150 105 110 160 120 230C130 290 190 300 230 330C270 360 235 440 300 440Z' },
      port: { vb: [420, 480], plate: [0, 1], d: 'M120 410H260C310 410 335 380 325 345C315 312 275 305 250 290C225 275 225 250 250 235L300 205C340 180 335 125 290 110C250 97 215 115 190 140C165 165 140 165 120 140C95 110 60 105 45 140C28 180 50 210 75 230C100 250 92 285 70 315C45 350 65 410 120 410Z' }
    };
    const FR = { first: 0.14, last: 0.84 };
    const FLAGS = ['green', 'white', 'yellow', 'blue', 'red'];
    let mode, P, L, cx = 0, cy = 0, stops = [], cur = -2, p = 0, target = 0, cfg;
    const el = id => $('#' + id);
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
    const pts = (n) => { const a = []; for (let i = 0; i <= n; i++) a.push(P.getPointAtLength(L * i / n)); return a; };

    function build() {
      const box = $('.track-box').getBoundingClientRect();
      const m = box.width / Math.max(box.height, 1) < 1.25 ? 'port' : 'land';
      if (m === mode) return; mode = m; cfg = CFG[m];
      svg.setAttribute('viewBox', `0 0 ${cfg.vb[0]} ${cfg.vb[1]}`);
      for (const id of ['pShadow', 'pRun', 'pKerbR', 'pKerbW', 'pAsphalt', 'pDash', 'pDone']) el(id).setAttribute('d', cfg.d);
      P = el('pAsphalt'); L = P.getTotalLength();
      const done = el('pDone'); done.style.strokeDasharray = L; done.style.strokeDashoffset = L;
      const samp = pts(240); cx = samp.reduce((s, q) => s + q.x, 0) / samp.length; cy = samp.reduce((s, q) => s + q.y, 0) / samp.length;
      const out = (pt, d) => { const dx = pt.x - cx, dy = pt.y - cy, l = Math.hypot(dx, dy) || 1; return { x: pt.x + dx / l * d, y: pt.y + dy / l * d }; };

      // corner numbers (curvature peaks)
      const turns = el('turns'); turns.innerHTML = '';
      const N = 360, S = pts(N), k = [];
      for (let i = 0; i < N; i++) {
        const a = S[(i - 7 + N) % N], b = S[i], c = S[(i + 7) % N];
        const a1 = Math.atan2(b.y - a.y, b.x - a.x), a2 = Math.atan2(c.y - b.y, c.x - b.x);
        let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        k.push(d);
      }
      const peaks = []; for (let i = 0; i < N; i++) { let ok = Math.abs(k[i]) > .5; for (let j = -14; j <= 14 && ok; j++) if (j && Math.abs(k[(i + j + N) % N]) > Math.abs(k[i])) ok = false; if (ok && i > 8 && i < N - 8) peaks.push(i); }
      peaks.forEach((i, n) => {
        const q = S[i], t = { x: S[(i + 2) % N].x - S[(i - 2 + N) % N].x, y: S[(i + 2) % N].y - S[(i - 2 + N) % N].y }, tl = Math.hypot(t.x, t.y) || 1;
        const sgn = k[i] > 0 ? 1 : -1; const nx = sgn * t.y / tl, ny = -sgn * t.x / tl; // outside of the turn
        const g = mk('g', { class: 'turn' }, turns);
        mk('circle', { cx: q.x + nx * 25, cy: q.y + ny * 25, r: 9 }, g);
        const tx = mk('text', { x: q.x + nx * 25, y: q.y + ny * 25 }, g); tx.textContent = n + 1;
      });

      // start / finish line
      const sl = el('startLine'); sl.innerHTML = '';
      const s0 = P.getPointAtLength(0), s1 = P.getPointAtLength(4), ang = Math.atan2(s1.y - s0.y, s1.x - s0.x) * 180 / Math.PI;
      const g = mk('g', { transform: `translate(${s0.x} ${s0.y}) rotate(${ang})` }, sl);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) mk('rect', { x: -5 + c * 5, y: -15 + r * 5, width: 5, height: 5, fill: (r + c) % 2 ? '#fff' : '#000' }, g);
      mk('rect', { x: -5, y: -15, width: 10, height: 30, fill: 'none', stroke: '#fff', 'stroke-width': .8 }, g);

      // pit-board plates
      const L1 = el('leaders'), G = el('stops'); L1.innerHTML = ''; G.innerHTML = ''; stops = [];
      const items = S_items(); const W = m === 'land' ? 1 : .84;
      items.forEach((it, i) => {
        const fr = items.length === 1 ? FR.first : FR.first + (FR.last - FR.first) * i / (items.length - 1);
        stops.push(plate(it, i, fr, W, out, L1, G));
      });
      // venue plate at start/finish
      const vp = out(s0, 0); const vy = s0.y + 62;
      const w = 150, h = 44 * W, x = clampX(s0.x - w / 2, w), y = Math.min(vy, cfg.vb[1] - h - 4);
      mk('path', { class: 'leader on', d: `M${s0.x} ${s0.y + 14}V${y}` }, L1);
      const pg = mk('g', { class: 'plate fin', transform: `translate(${x} ${y})` }, G);
      mk('path', { class: 'bg', d: `M0 0H${w}V${h - 9}L${w - 9} ${h}H0Z` }, pg); mk('rect', { class: 'bar', width: 5, height: h }, pg);
      const fl = mk('use', { href: '#flag-chk', x: 12, y: h / 2 - 9, width: 27, height: 18 }, pg);
      const t1 = mk('text', { class: 'tm', x: 46, y: 18 * W + 2 }, pg); t1.textContent = 'FINISH';
      const t2 = mk('text', { class: 'tt', x: 46, y: h - 9 }, pg); t2.textContent = trunc(S.venueName || 'Фініш', 17);
      cur = -2; place(p);
    }
    const S_items = () => S.schedule || [];
    const trunc = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
    const clampX = (x, w) => Math.max(6, Math.min(cfg.vb[0] - w - 6, x));
    function plate(it, i, fr, W, out, Lg, G) {
      const pt = P.getPointAtLength(L * fr), ap = out(pt, 78 * W);
      const w = Math.max(132, 60 + Math.min(22, (it.title || '').length) * 9.4), h = 46 * W;
      const x = clampX(ap.x - w / 2, w), y = Math.max(6, Math.min(cfg.vb[1] - h - 6, ap.y - h / 2));
      const ld = mk('path', { class: 'leader', d: `M${pt.x} ${pt.y}L${x + w / 2} ${y + h / 2}` }, Lg);
      const g = mk('g', { class: 'plate', transform: `translate(${x} ${y})` }, G);
      mk('path', { class: 'bg', d: `M0 0H${w}V${h - 9}L${w - 9} ${h}H0Z` }, g); mk('rect', { class: 'bar', width: 5, height: h }, g);
      mk('use', { href: '#flag-' + FLAGS[i % FLAGS.length], x: 12, y: h / 2 - 9, width: 27, height: 18 }, g);
      const t1 = mk('text', { class: 'tm', x: 46, y: 18 * W + 2 }, g); t1.textContent = it.time || '';
      const t2 = mk('text', { class: 'tt', x: 46, y: h - 9 }, g); t2.textContent = trunc(it.title || '', 22);
      return { fr, g, ld };
    }
    function place(prog) {
      if (!P) return;
      const len = L * prog, pt = P.getPointAtLength(len), a = P.getPointAtLength(Math.max(0, len - 3)), b = P.getPointAtLength(Math.min(L, len + 3));
      let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      if (prog <= .001) { const n = P.getPointAtLength(4); ang = Math.atan2(n.y - pt.y, n.x - pt.x) * 180 / Math.PI; }
      el('car').setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${ang}) scale(${mode === 'land' ? 1.35 : 1.15})`);
      el('pDone').style.strokeDashoffset = L - len;
      let idx = -1; stops.forEach((s, i) => { if (prog >= s.fr - .004) idx = i; });
      if (prog >= .992) idx = stops.length; // finished
      if (idx !== cur) {
        const first = cur === -2; cur = idx;
        stops.forEach((s, i) => { s.g.classList.toggle('on', i <= idx); s.g.classList.toggle('cur', i === idx); s.ld.classList.toggle('on', i <= idx); });
        card(idx, !first);
      }
    }
    function card(idx, anim) {
      const items = S_items(), fin = idx >= items.length, it = items[Math.max(0, Math.min(idx, items.length - 1))] || {};
      $('#scTime').textContent = idx < 0 ? 'START' : fin ? 'FINISH' : (it.time || '');
      $('#scTitle').textContent = idx < 0 ? 'Старт гонки' : fin ? (S.venueName || 'Фініш') : it.title || '';
      $('#scText').textContent = idx < 0 ? 'Прокручуйте вниз — болід вирушає в коло, а з ним і наш весільний день.' : fin ? 'Ви на місці! Картатий прапор — і вечір починається.' : it.text || '';
      $('#scFlag').setAttribute('href', '#flag-' + (idx < 0 ? 'green' : fin ? 'chk' : FLAGS[idx % FLAGS.length]));
      $('#scDots').innerHTML = items.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('');
      const c = $('#stopCard'); if (anim) { c.classList.remove('swap'); void c.offsetWidth; c.classList.add('swap'); Audio_.stop(); }
    }
    function measure() { const r = $('#route').getBoundingClientRect(); target = clamp(-r.top / Math.max(r.height - innerHeight, 1), 0, 1); }
    function frame() {
      measure(); p += (target - p) * (reduced ? 1 : .12); if (Math.abs(target - p) < .0004) p = target;
      if (P) place(clamp(p, 0, 1));
    }
    return { init() { build(); addEventListener('resize', () => build()); }, frame };
  })();

  /* =============== RSVP =============== */
  function rsvp() {
    const f = $('#rsvpForm'), err = $('#rsvpErr'), yes = $('#yesOnly');
    const code = urlCode || store.get('gp_code') || '';
    f.code.value = code;
    if (guest) { f.name.value = guest.name; f.phone.value = ''; if (guest.maxParty < 2) $('#plusWrap').hidden = true; }
    if (guest && guest.attending !== null) {
      f.attending.value = guest.attending ? 'yes' : 'no';
      if (guest.attending) { f.plusOne.checked = guest.plusOne; f.plusName.value = guest.plusName; f.diet.value = guest.diet; $$('input[name=drink]', f).forEach(i => i.checked = guest.drinks.includes(i.value)); }
    }
    const sync = () => {
      const v = f.attending.value; yes.hidden = v !== 'yes';
      $('#plusNameWrap').hidden = !f.plusOne.checked;
    };
    f.addEventListener('change', e => {
      if (e.target.name === 'drink') { // "no alcohol" excludes others
        const none = /^Не вживаю/i; const on = e.target.checked;
        $$('input[name=drink]', f).forEach(i => { if (i !== e.target && on && (none.test(e.target.value) || none.test(i.value))) i.checked = false; });
      }
      sync();
    });
    sync();
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.hidden = true;
      const name = f.name.value.trim(), att = f.attending.value;
      if (name.length < 2) { err.textContent = 'Вкажіть ім’я та прізвище.'; err.hidden = false; f.name.focus(); return; }
      if (!att) { err.textContent = 'Оберіть, чи будете ви з нами.'; err.hidden = false; return; }
      const btn = $('.submit', f); btn.disabled = true;
      try {
        const r = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          code: f.code.value, name, phone: f.phone.value, attending: att === 'yes', plusOne: f.plusOne.checked, plusName: f.plusName.value, diet: f.diet.value,
          drinks: $$('input[name=drink]:checked', f).map(i => i.value) }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Помилка');
        store.set('gp_code', j.guest.code); f.code.value = j.guest.code;
        const first = name.split(' ')[0];
        $('#doneTitle').textContent = att === 'yes' ? 'Ви на старті!' : 'Дякуємо, що повідомили';
        $('#doneText').textContent = att === 'yes' ? `${first}, ми запишемо вас до стартової решітки. Побачимось ${$('#heroDate').textContent}!` : `${first}, нам шкода, що ви не зможете бути поруч, але дякуємо за відповідь. Ми завжди про вас пам’ятаємо.`;
        f.hidden = true; $('#rsvpDone').hidden = false; $('#rsvpDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
        Audio_.finish();
      } catch (x) { err.textContent = x.message || 'Не вдалося надіслати. Спробуйте ще раз.'; err.hidden = false; }
      btn.disabled = false;
    });
    $('#editAgain').addEventListener('click', () => { $('#rsvpDone').hidden = true; f.hidden = false; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); });

    const w = $('#wishForm');
    if (guest) w.name.value = guest.name;
    w.addEventListener('submit', async e => {
      e.preventDefault(); const er = $('#wishErr'), ok = $('#wishOk'); er.hidden = ok.hidden = true;
      const btn = $('button', w); btn.disabled = true;
      try {
        const r = await fetch('/api/wish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: f.code.value, name: w.name.value, message: w.message.value }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Помилка');
        ok.hidden = false; w.message.value = ''; Audio_.stop();
      } catch (x) { er.textContent = x.message; er.hidden = false; }
      btn.disabled = false;
    });
  }

  /* =============== page chrome =============== */
  function chrome() {
    const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
    burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
    menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(e => io.observe(e));
    const fin = $('#finish');
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { fin.classList.add('run'); setTimeout(() => Audio_.finish(), 1800); o.disconnect(); } }, { threshold: .35 }).observe(fin);
    let ticking = false;
    const loop = () => {
      nav.classList.toggle('solid', scrollY > 40);
      document.documentElement.style.setProperty('--sx', -(scrollY * .35 % 56) + 'px');
      nav.style.setProperty('--prog', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100) + '%');
      Track.frame();
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
    // keep easing smooth after scroll stops
    setInterval(() => { Track.frame(); }, 60);
    loop();
  }

  /* =============== boot =============== */
  (async function () {
    try {
      const r = await fetch('/api/site' + (urlCode ? '?g=' + encodeURIComponent(urlCode) : ''), { cache: 'no-store' });
      const j = await r.json(); S = j.settings; guest = j.guest;
    } catch { S = { schedule: [], drinks: [], dressColors: [] }; }
    fill(); countdown(); rsvp(); Track.init(); chrome(); runIntro();
    if (location.hash.length > 1) setTimeout(() => { const t = document.querySelector(location.hash); t && t.scrollIntoView(); }, 50);
  })();
})();

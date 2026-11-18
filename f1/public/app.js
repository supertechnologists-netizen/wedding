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

  /* Formula 1 team colours, seasons 2024–2026 */
  const TEAMS = [
    { c: '#E8002D', n: 'Ferrari' }, { c: '#FF8000', n: 'McLaren' }, { c: '#3671C6', n: 'Red Bull' }, { c: '#229971', n: 'Aston Martin' },
    { c: '#FF87BC', n: 'Alpine', t: '#141414' }, { c: '#64C4FF', n: 'Williams', t: '#141414' }, { c: '#27F4D2', n: 'Mercedes', t: '#141414' },
    { c: '#6692FF', n: 'Racing Bulls' }, { c: '#52E252', n: 'Sauber · Audi', t: '#141414' }, { c: '#B6BABD', n: 'Haas', t: '#141414' }
  ];
  const PARTY = ['#E8002D', '#FF8000', '#FF87BC', '#64C4FF', '#27F4D2', '#3671C6', '#ffd166', '#ffffff', '#229971'];
  const LOVE = ['#E8002D', '#ff3d6e', '#FF87BC', '#ff5a5f', '#FF8000'];

  /* =============== AUDIO =============== */
  const Audio_ = (() => {
    let ctx, master, sfxOn = false, musicOn = false, musicTimer, step = 0, nextT = 0, el;
    const ensure = () => {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const tone = (f, dur = .12, vol = .05, type = 'square', when = 0, f2, force) => {
      if ((!sfxOn && !force) || !ensure()) return;
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
    const noiseTo = (dest, t, dur, vol, type, freq) => {
      const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; f.type = type; f.frequency.value = freq; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(dest); s.start(t);
    };
    let musicGain;
    const arp = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
    const schedule = () => {
      const bpm = 126, sp = 60 / bpm / 4;
      while (nextT < ctx.currentTime + .15) {
        const s = step % 16, bar = Math.floor(step / 16) % 4;
        if (s % 4 === 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, nextT); o.frequency.exponentialRampToValueAtTime(40, nextT + .14); g.gain.setValueAtTime(.9, nextT); g.gain.exponentialRampToValueAtTime(.001, nextT + .2); o.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + .22); }
        if (s % 4 === 2) noiseTo(musicGain, nextT, .06, .18, 'highpass', 6000);
        if (s % 2 === 0) {
          const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = [55, 87.31 / 2, 65.41 / 2, 98 / 2][bar]; f.type = 'lowpass'; f.frequency.value = 420;
          g.gain.setValueAtTime(.45, nextT); g.gain.exponentialRampToValueAtTime(.001, nextT + sp * 1.8); o.connect(f); f.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + sp * 2);
        }
        {
          const n = arp[bar][s % 3], o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = n * 2;
          g.gain.setValueAtTime(.16, nextT); g.gain.exponentialRampToValueAtTime(.001, nextT + sp * .9); o.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + sp);
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
      chime: () => [1046, 1318, 1568].forEach((f, i) => tone(f, .5, .03, 'sine', i * .07)),
      finish: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, .05, 'triangle', i * .14)),
      // horn is played on a direct tap, so it works even with effects off
      horn: () => { [[392, 0], [494, 0], [392, .22], [494, .22]].forEach(([f, w]) => tone(f, .18, .045, 'square', w, 0, true)); },
      boom: () => { if (!sfxOn || !ensure()) return; const t = ctx.currentTime; noiseTo(master, t, .7, .35, 'lowpass', 900); noiseTo(master, t + .05, .5, .06, 'highpass', 3000); }
    };
  })();
  const bindToggle = (btn, get, set) => btn.addEventListener('click', () => { set(!get()); btn.setAttribute('aria-pressed', get()); if (btn.id === 'btnSfx' && get()) Audio_.stop(); });
  bindToggle($('#btnMusic'), () => Audio_.music, v => Audio_.setMusic(v));
  bindToggle($('#btnSfx'), () => Audio_.sfx, v => Audio_.setSfx(v));
  document.addEventListener('mouseover', e => { const b = e.target.closest('[data-sfx],.btn,.choice label,.chips label'); if (b && !b.contains(e.relatedTarget)) Audio_.tick(); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-sfx="rev"]'); if (b) Audio_.rev(); });

  /* =============== helpers =============== */
  const fmtDate = (d, o) => new Intl.DateTimeFormat('uk-UA', o).format(d);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cssUrl = u => `url("${String(u).replace(/"/g, '%22')}")`;

  /* =============== FX: hearts, petals, confetti (fixed overlay canvas) =============== */
  function heartPath(c, s) {
    c.beginPath(); c.moveTo(0, s * .38);
    c.bezierCurveTo(-s * 1.15, -s * .3, -s * .5, -s * 1.1, 0, -s * .45);
    c.bezierCurveTo(s * .5, -s * 1.1, s * 1.15, -s * .3, 0, s * .38); c.closePath();
  }
  const FX = (() => {
    const cv = $('#fx'), cx = cv.getContext('2d'); let parts = [], raf = 0, dpr = 1;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } };
    function tick() {
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const q of parts) {
        q.vy += q.g; q.vx *= q.drag; q.vy *= q.drag; q.x += q.vx + (q.sway ? Math.sin(q.t * q.sw) * q.sway : 0); q.y += q.vy; q.r += q.vr; q.t++; q.life--;
        cx.save(); cx.translate(q.x, q.y); cx.rotate(q.r); cx.globalAlpha = Math.min(1, q.life / 30) * (q.a || 1); cx.fillStyle = q.c;
        if (q.k === 'heart') { heartPath(cx, q.s); cx.fill(); }
        else if (q.k === 'petal') { cx.scale(1, .55 + .45 * Math.abs(Math.sin(q.t * .05))); cx.beginPath(); cx.ellipse(0, 0, q.s, q.s * .62, 0, 0, Math.PI * 2); cx.fill(); }
        else cx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2);
        cx.restore();
      }
      parts = parts.filter(q => q.life > 0 && q.y < innerHeight + 60 && q.y > -200);
      if (parts.length) raf = requestAnimationFrame(tick); else { cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); raf = 0; }
    }
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const add = p => parts.push(Object.assign({ g: .12, drag: .99, r: 0, vr: 0, t: 0, a: 1 }, p));
    return {
      hearts(x, y, n = 12, colors = LOVE, power = 1) {
        if (reduced) return; size();
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rnd(-1.25, 1.25), v = rnd(2.5, 6.5) * power;
          add({ k: 'heart', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: -.03, drag: .965, s: rnd(7, 14), r: rnd(-.4, .4), vr: rnd(-.03, .03), c: pick(colors), life: rnd(55, 85) }); }
        go();
      },
      confetti(x = innerWidth / 2, y = innerHeight * .4, n = 130, colors = PARTY) {
        if (reduced) return; size();
        for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(3, 10);
          add({ k: 'rect', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, g: .14, drag: .985, s: rnd(8, 13), r: rnd(0, 6), vr: rnd(-.25, .25), c: colors[i % colors.length], life: rnd(100, 170) }); }
        go();
      },
      petals(n = 50) {
        if (reduced) return; size();
        const cols = ['#ffd1dc', '#ffb3c6', '#ff87bc', '#fff0f4', '#ff3d6e', '#ffffff'];
        for (let i = 0; i < n; i++) add({ k: i % 5 ? 'petal' : 'heart', x: rnd(0, innerWidth), y: rnd(-160, -10), vx: rnd(-.6, .6), vy: rnd(1, 2.4), g: .012, drag: .995, sway: rnd(.4, 1.2), sw: rnd(.03, .07), s: rnd(6, 11), r: rnd(0, 6), vr: rnd(-.04, .04), c: pick(cols), a: .95, life: 420 });
        go();
      },
      rain(n = 40) {
        if (reduced) return; size();
        for (let i = 0; i < n; i++) add({ k: 'heart', x: rnd(0, innerWidth), y: rnd(-300, -10), vx: 0, vy: rnd(1.5, 3.5), g: .02, drag: .995, sway: rnd(.3, 1), sw: rnd(.03, .06), s: rnd(8, 18), r: rnd(-.3, .3), c: pick(LOVE.concat(PARTY.slice(0, 4))), life: 420 });
        go();
      }
    };
  })();

  /* =============== FIREWORKS (finish section canvas) =============== */
  const Fireworks = (() => {
    const cv = $('#fw'), cx = cv.getContext('2d'); let rockets = [], sparks = [], raf = 0, dpr = 1, W = 0, H = 0;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; const w = Math.round(W * dpr), h = Math.round(H * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } };
    function explode(r) {
      Audio_.boom();
      const heart = Math.random() < .35, n = heart ? 80 : 110, c1 = r.c, c2 = pick(PARTY);
      for (let i = 0; i < n; i++) {
        let vx, vy;
        if (heart) { const t = i / n * Math.PI * 2, k = rnd(.36, .4); vx = 16 * Math.pow(Math.sin(t), 3) * k; vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k; }
        else { const a = rnd(0, Math.PI * 2), v = rnd(1.5, 7.5); vx = Math.cos(a) * v; vy = Math.sin(a) * v; }
        sparks.push({ x: r.x, y: r.y, px: r.x, py: r.y, vx, vy, c: i % 3 ? c1 : c2, life: rnd(70, 105), max: 105, w: rnd(2.2, 3.4) });
      }
    }
    function tick() {
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round';
      for (const r of rockets) {
        r.px = r.x; r.py = r.y; r.vy += .05; r.x += r.vx; r.y += r.vy;
        cx.strokeStyle = 'rgba(255,230,190,.9)'; cx.lineWidth = 2.2; cx.beginPath(); cx.moveTo(r.px, r.py + 6); cx.lineTo(r.x, r.y); cx.stroke();
        if (r.vy >= -.6 || r.y <= r.ty) { r.dead = true; explode(r); }
      }
      rockets = rockets.filter(r => !r.dead);
      for (const s of sparks) {
        s.px = s.x; s.py = s.y; s.vx *= .975; s.vy = s.vy * .975 + .035; s.x += s.vx; s.y += s.vy; s.life--;
        cx.globalAlpha = clamp(s.life / 45, 0, 1); cx.strokeStyle = s.c; cx.lineWidth = s.w; cx.beginPath(); cx.moveTo(s.px, s.py); cx.lineTo(s.x, s.y); cx.stroke();
      }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      sparks = sparks.filter(s => s.life > 0);
      if (rockets.length || sparks.length) raf = requestAnimationFrame(tick); else { cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); raf = 0; }
    }
    function launch(xf) {
      size(); if (!W || !H) return;
      const x = (xf ?? rnd(.15, .85)) * W, ty = rnd(.08, .42) * H, y = H * .95;
      rockets.push({ x, y, vx: rnd(-.6, .6), vy: -Math.sqrt(2 * .05 * (y - ty)) * 1.02, ty, c: pick(PARTY.slice(0, 7)) });
      if (!raf) raf = requestAnimationFrame(tick);
    }
    const timers = [];
    return {
      salvo(n = 6, gap = 380) { if (reduced) return; for (let i = 0; i < n; i++) timers.push(setTimeout(() => launch(), i * gap + rnd(0, 150))); },
      launch, stop() { timers.splice(0).forEach(clearTimeout); }
    };
  })();

  /* =============== LOADER =============== */
  function runIntro() {
    const intro = $('#intro'), lights = $$('.lights i'), txt = $('#introText');
    let done = false; const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finish = (instant) => {
      if (done) return; done = true; timers.forEach(clearTimeout);
      sess.set('gp_seen', '1');
      document.body.classList.add('go'); document.body.classList.remove('intro-on');
      Timeline.build();
      if (instant) { intro.remove(); return; }
      intro.classList.add('out'); setTimeout(() => intro.remove(), 1200);
    };
    $('#skipIntro').addEventListener('click', () => finish(false));
    if (reduced || location.hash.length > 1 || sess.get('gp_seen')) return finish(true);
    lights.forEach((l, i) => later(() => { l.classList.add('on'); Audio_.beep(); }, 600 + i * 520));
    const hold = 600 + 5 * 520 + 500 + Math.random() * 600;
    later(() => { lights.forEach(l => l.classList.remove('on')); txt.textContent = 'Lights out and away we go!'; txt.classList.add('go'); Audio_.go(); }, hold);
    later(() => finish(false), hold + 800);
  }

  /* =============== CONTENT =============== */
  const FLAGS = ['red', 'orange', 'blue', 'green', 'pink', 'yellow'];
  const flagSvg = n => `<svg viewBox="0 0 36 24"><use href="#flag-${n}"/></svg>`;
  const colors = () => (S.dressColors || []).map(c => typeof c === 'string' ? { hex: c, name: '' } : c);
  const ICONS = [[/збір|гост|фуршет|welcome|зустріч|коктейл/i, 'glasses'], [/церемон|реєстр|вінчан|розпис|клятв/i, 'rings'], [/вечер|банкет|обід|dinner|торт/i, 'cake'], [/вечірк|танц|party|диско|музик/i, 'music'], [/феєрв|салют|фінал/i, 'spark']];
  const iconFor = t => (ICONS.find(([re]) => re.test(t || '')) || [0, 'heart'])[1];
  const LIKE = '<span class="like" aria-hidden="true"><svg><use href="#i-heart"/></svg></span>';
  // a generated portrait illustration has a matching round "face" picture for the car
  const faceOf = url => url && /(^|\/)img\/(bride|groom)\.svg$/.test(url) ? url.replace(/(bride|groom)\.svg$/, 'face-$1.svg') : url;
  function photoInto(box, url, alt) {
    if (!url) return;
    const img = new Image(); img.alt = alt; img.src = url; img.draggable = false; box.prepend(img);
    const m = $('.mount', box); if (m) m.style.display = 'none';
    box.removeAttribute('data-ph');
  }
  function fill() {
    const bride = S.bride || 'Аня', groom = S.groom || 'Андрій';
    const lat = x => x.toUpperCase().replace('АНЯ', 'ANNA').replace('АНДРІЙ', 'ANDRII');
    $('#nBride').textContent = lat(bride); $('#nGroom').textContent = lat(groom);
    document.title = `${lat(bride)} × ${lat(groom)} · Wedding Grand Prix`;
    const d = new Date(S.eventDate), valid = !isNaN(d);
    const dateStr = valid ? fmtDate(d, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    $('#heroDate').textContent = valid ? fmtDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : '';
    $('#heroVenue').textContent = S.venueName || '';
    $('#finDate').textContent = dateStr + (S.venueName ? ' · ' + S.venueName : '');
    $('#vDate').textContent = valid ? fmtDate(d, { day: 'numeric', month: 'long' }) : '';
    $('#vTime').textContent = valid ? fmtDate(d, { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    $('#vName').textContent = S.venueName || ''; $('#vAddr').textContent = S.venueAddress || '';
    const map = $('#vMap'); if (S.mapUrl) map.href = S.mapUrl; else map.hidden = true;
    const q = [S.venueName, S.venueAddress].filter(Boolean).join(', ');
    if (q) $('#mapFrame').src = 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed&hl=uk'; else $('.vmap').hidden = true;
    if (S.rsvpDeadline) { const dl = new Date(S.rsvpDeadline + 'T12:00:00'); $('#vDeadline').innerHTML = isNaN(dl) ? '' : `Будь ласка, підтвердіть участь до <b>${fmtDate(dl, { day: 'numeric', month: 'long' })}</b>`; }
    $('#story').textContent = S.story || '';
    photoInto($('#heroPhoto'), S.heroPhoto || S.couplePhoto, `${bride} та ${groom}`);
    for (const [id, bio, photo, name] of [['#dBride', S.brideBio, S.bridePhoto, bride], ['#dGroom', S.groomBio, S.groomPhoto, groom]]) {
      const el = $(id); $('.bio', el).textContent = bio || ''; $('h3', el).textContent = name;
      const ph = $('.photo', el); ph.dataset.ph = name.charAt(0); photoInto(ph, photo, name);
    }
    // faces of the couple in the car cockpit (timeline + loader)
    [[['#face1', '.ld-car .f1'], S.bridePhoto], [['#face2', '.ld-car .f2'], S.groomPhoto]].forEach(([sels, url]) => {
      const u = faceOf(url); if (!u) return;
      sels.forEach(s => { const f = $(s); if (f) { f.style.backgroundImage = cssUrl(u); f.classList.add('has'); } });
    });
    // route
    $('#routeText').textContent = S.routeText || '';
    $('#tlItems').innerHTML = (S.schedule || []).map((it, i) => { const t = TEAMS[i % TEAMS.length];
      return `<article class="ti rv" data-i="${i}" style="--c:${t.c};--ct:${t.t || '#fff'}"><div class="ti-head"><span class="ic"><svg><use href="#i-${iconFor(it.title + ' ' + it.text)}"/></svg></span><div class="tm">${esc(it.time || '')}</div></div><h3>${esc(it.title)}</h3><p>${esc(it.text || '')}</p><span class="team">${t.n}</span></article>`; }).join('');
    // gallery
    const gal = (S.gallery || []).filter(g => g.url || g.caption);
    $('#gallery').hidden = !gal.length;
    $('#gal').innerHTML = gal.map((g, i) => `<figure class="gi">${g.url ? `<img src="${esc(g.url)}" alt="${esc(g.caption)}" loading="lazy" draggable="false">` : ''}${LIKE}${g.caption ? `<figcaption class="cap">${flagSvg(i % 6 === 5 ? 'chk' : FLAGS[i % 6])}${esc(g.caption)}</figcaption>` : ''}</figure>`).join('');
    // dress
    $('#dressText').textContent = S.dressText || ''; $('#dressW').textContent = S.dressWomen || ''; $('#dressM').textContent = S.dressMen || '';
    const sw = $('#swatches');
    sw.innerHTML = colors().map((c, i) => `<div class="sw" role="listitem" tabindex="0" data-i="${i}"><i style="background:${esc(c.hex)}"></i><span>${esc(c.name || c.hex)}</span></div>`).join('');
    const pickSw = el => {
      $$('.sw', sw).forEach(x => x.classList.toggle('sel', x === el)); const c = colors()[+el.dataset.i];
      $('#swPicked').innerHTML = `Вибраний колір: <b>${esc(c.name || c.hex)}</b> · ${esc(c.hex)}`; Audio_.tick();
      const r = $('i', el).getBoundingClientRect(); FX.confetti(r.left + r.width / 2, r.top + r.height / 2, 26, [c.hex, c.hex, '#fff']);
    };
    sw.addEventListener('click', e => { const el = e.target.closest('.sw'); if (el) pickSw(el); });
    sw.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sw')) { e.preventDefault(); pickSw(e.target); } });
    // gifts
    const gifts = (S.gifts || []).filter(g => g.title || g.image);
    const showGift = !!(S.giftText || gifts.length);
    $('#gift').hidden = !showGift;
    if (S.giftTitle) $('#giftTitle').innerHTML = esc(S.giftTitle).replace(/\s+/, '<br>');
    $('#giftText').textContent = S.giftText || '';
    $('#gifts').hidden = !gifts.length;
    $('#gifts').innerHTML = gifts.map(g => `<div class="gf">${g.image ? `<img src="${esc(g.image)}" alt="${esc(g.title)}" loading="lazy">` : ''}${g.title ? `<span>${esc(g.title)}</span>` : ''}</div>`).join('');
    const gb = $('#giftBtn'); if (S.giftUrl) { gb.href = S.giftUrl; gb.textContent = S.giftButton || 'Обрати подарунок'; } else gb.hidden = true;
    $('#drinkChips').innerHTML = (S.drinks || []).map(x => `<label><input type="checkbox" name="drink" value="${esc(x)}"><span>${esc(x)}</span></label>`).join('');
    if (guest) {
      const first = guest.name.split(' ')[0];
      $('#greet').innerHTML = `Особисто для вас, <b>${esc(guest.name)}</b>`;
      $('#rsvpLead').textContent = `${first}, дайте нам знати, чи будете ви поруч. Це займе хвилину.` + (guest.responded ? ' Ви вже відповіли — за потреби змініть відповідь.' : '');
    } else $('#greet').textContent = 'Дорогі гості, ви запрошені';
  }

  /* =============== COUNTDOWN =============== */
  function countdown() {
    const t = new Date(S.eventDate).getTime(); if (isNaN(t)) return;
    const els = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
    const tick = () => {
      const diff = t - Date.now();
      if (diff <= 0) { Object.values(els).forEach(e => e.textContent = '00'); $('#cdNote').textContent = 'Lights out! Свято вже триває'; return; }
      const s = Math.floor(diff / 1000), p = n => String(n).padStart(2, '0');
      els.d.textContent = Math.floor(s / 86400); els.h.textContent = p(Math.floor(s % 86400 / 3600)); els.m.textContent = p(Math.floor(s % 3600 / 60)); els.s.textContent = p(s % 60);
      $('#cdNote').textContent = 'І ми скажемо одне одному «так»';
    };
    tick(); setInterval(tick, 1000);
  }

  /* =============== TIMELINE: winding road + car with the couple =============== */
  const Timeline = (() => {
    const tl = $('#tl'), car = $('#car'), rot = $('#carRot'), svg = $('#road'), paths = [$('#rBed'), $('#rDone'), $('#rDash')], trail = $('#rDone'), dotsBox = $('#tlDots'), endEl = $('#tlEnd');
    let pts = [], total = 0, L = 0, ang = 90, started = false, arrived = false, dots = [], endP = null, W = 0, H = 0;
    const at = l => { // point on the road at length l (from cached samples)
      if (!pts.length) return { x: 0, y: 0 };
      const i = clamp(Math.floor(l / 4), 0, pts.length - 2), a = pts[i], b = pts[i + 1], k = clamp((l - a.l) / ((b.l - a.l) || 1), 0, 1);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    };
    const lenAtY = y => { // road always goes down (y is non-decreasing), so binary search works
      let lo = 0, hi = pts.length - 1; if (!pts.length) return 0; if (y <= pts[0].y) return 0; if (y >= pts[hi].y) return total;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].y < y) lo = m; else hi = m; }
      const a = pts[lo], b = pts[hi]; return a.l + (b.l - a.l) * clamp((y - a.y) / ((b.y - a.y) || 1), 0, 1);
    };
    function build() {
      const items = $$('.ti', tl), list = $('#tlItems'); if (!items.length) return;
      W = tl.clientWidth; H = tl.clientHeight; if (!W || !H) return;
      const oy = list.offsetTop, ox = list.offsetLeft;
      const cols = items.map(it => {
        const left = ox + it.offsetLeft, right = left + it.offsetWidth, top = oy + it.offsetTop, bot = top + it.offsetHeight;
        const onLeft = left + it.offsetWidth / 2 < W / 2;
        return { x: onLeft ? (right + W) / 2 : left / 2, top, bot, it };
      });
      const ex = W / 2, ey = H - 34; endP = { x: ex, y: ey };
      const c0 = cols[0];
      let d = `M${c0.x} 0L${c0.x} ${c0.top + 8}`;
      cols.forEach((c, i) => {
        const n = cols[i + 1], y0 = c.bot - 8;
        d += `L${c.x} ${y0}`;
        const tx = n ? n.x : ex, ty = n ? n.top + 8 : ey - 30, k = (ty - y0) / 2;
        d += `C${c.x} ${y0 + k} ${tx} ${ty - k} ${tx} ${ty}`;
        if (!n) d += `L${ex} ${ey}`;
      });
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      paths.forEach(p => p.setAttribute('d', d));
      total = paths[0].getTotalLength(); pts = [];
      for (let l = 0; l <= total + 4; l += 4) { const p = paths[0].getPointAtLength(Math.min(l, total)); pts.push({ l: Math.min(l, total), x: p.x, y: p.y }); }
      // keep y monotonic for the lookup
      for (let i = 1; i < pts.length; i++) if (pts[i].y < pts[i - 1].y) pts[i].y = pts[i - 1].y;
      dotsBox.innerHTML = cols.map((c, i) => `<i class="dot" data-i="${i}" style="left:${c.x}px;top:${c.top + 30}px;--c:${getComputedStyle(c.it).getPropertyValue('--c')}"></i>`).join('');
      dots = cols.map((c, i) => ({ el: dotsBox.children[i], l: lenAtY(c.top + 30), x: c.x, y: c.top + 30, c: TEAMS[i % TEAMS.length].c, on: false }));
      endEl.style.left = ex + 'px'; endEl.style.top = ey + 'px';
      place(true);
    }
    function place(force) {
      if (!pts.length) return;
      const r = tl.getBoundingClientRect();
      const target = lenAtY(innerHeight * .5 - r.top);
      if (!started || force === true && !started) { L = target; started = true; }
      L += (target - L) * (reduced ? 1 : .14); if (Math.abs(target - L) < .3) L = target;
      const p = at(L), p1 = at(Math.max(0, L - 6)), p2 = at(Math.min(total, L + 6));
      const a = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
      let da = ((a - ang + 540) % 360) - 180; ang += da * (reduced ? 1 : .35);
      car.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      rot.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      trail.style.strokeDasharray = `${L.toFixed(1)} ${(total + 20).toFixed(0)}`;
      car.classList.toggle('show', r.top < innerHeight && r.bottom > 0);
      for (const d of dots) {
        const on = L >= d.l - 2;
        if (on === d.on) continue;
        d.on = on; d.el.classList.toggle('on', on); d.el.closest('.tl') && $$('.ti', tl)[+d.el.dataset.i]?.classList.toggle('active', on);
        const sy = r.top + d.y;
        if (on && sy > 0 && sy < innerHeight) { FX.hearts(r.left + d.x, sy, 14, [d.c, d.c, '#ff3d6e', '#FF87BC']); Audio_.chime(); }
      }
      const done = L >= total - 3;
      if (done && !arrived) {
        const sy = r.top + endP.y;
        if (sy > 0 && sy < innerHeight) {
          arrived = true; endEl.classList.remove('hit'); void endEl.offsetWidth; endEl.classList.add('hit');
          Audio_.finish(); FX.confetti(r.left + endP.x, sy - 30, 110); FX.hearts(r.left + endP.x, sy - 30, 16);
        }
      }
      if (L < total - 160) arrived = false;
    }
    function honk(e) {
      e.preventDefault(); Audio_.horn();
      car.classList.remove('honk'); void car.offsetWidth; car.classList.add('honk');
      const b = car.getBoundingClientRect(); FX.hearts(b.left, b.top - 10, 16, LOVE, 1.2);
    }
    return {
      frame: place, build,
      init() {
        car.addEventListener('click', honk);
        tl.addEventListener('click', e => { const t = e.target.closest('.ti'); if (t) { FX.hearts(e.clientX, e.clientY, 9, [getComputedStyle(t).getPropertyValue('--c').trim(), '#ff3d6e', '#FF87BC']); Audio_.tick(); } });
        if ('ResizeObserver' in window) { let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 60); }).observe(tl); } else addEventListener('resize', build);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
        build();
      }
    };
  })();

  /* =============== FINISH: car crosses the line → fireworks =============== */
  const Finish = (() => {
    const sec = $('#finish'), road = $('#finRoad'), car = $('#fCar'), line = $('#fLine');
    let state = 'idle', raf = 0, ambient = 0, visible = false;
    function cross() {
      sec.classList.add('crossed'); Audio_.finish();
      const b = line.getBoundingClientRect();
      FX.hearts(b.left + b.width / 2, b.top, 18, LOVE.concat(['#fff']), 1.3);
      Fireworks.salvo(7, 420);
    }
    function run() {
      if (state !== 'idle') return; state = 'run';
      const W = road.clientWidth, cw = car.offsetWidth, lineX = line.offsetLeft, lw = line.offsetWidth;
      const x0 = -cw * 1.7, x1 = Math.min(W - cw - 6, lineX + lw + 14);
      const dur = reduced ? 1 : 2700, t0 = performance.now(); let crossed = false;
      car.classList.add('drive'); if (!reduced) Audio_.rev();
      const step = now => {
        const t = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - t, 3), x = x0 + (x1 - x0) * e;
        car.style.transform = `translateX(${x.toFixed(1)}px)`;
        if (!crossed && x + cw * .55 >= lineX + lw / 2) { crossed = true; cross(); }
        if (t < 1) raf = requestAnimationFrame(step); else { car.classList.remove('drive'); state = 'done'; }
      };
      raf = requestAnimationFrame(step);
    }
    function reset() { cancelAnimationFrame(raf); state = 'idle'; sec.classList.remove('crossed'); car.classList.remove('drive'); car.style.transform = ''; Fireworks.stop(); }
    return {
      init() {
        // start only when the whole finish road is on screen (not earlier), reset once the guest scrolls back up
        new IntersectionObserver(es => es.forEach(e => {
          if (e.isIntersecting && e.intersectionRatio > .98) run();
          else if (!e.isIntersecting && e.boundingClientRect.top > innerHeight && state !== 'run') reset();
          else if (!e.isIntersecting && e.boundingClientRect.bottom < 0 && state === 'idle') { // jumped past it: park the car behind the line
            state = 'done'; sec.classList.add('crossed');
            car.style.transform = `translateX(${Math.min(road.clientWidth - car.offsetWidth - 6, line.offsetLeft + line.offsetWidth + 14)}px)`;
          }
        }), { threshold: [0, 1], rootMargin: '0px 0px -12% 0px' }).observe(road);
        new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: .2 }).observe(sec);
        clearInterval(ambient);
        ambient = setInterval(() => { if (visible && state === 'done' && !document.hidden && Math.random() < .55) Fireworks.launch(); }, 2600);
        $('#salute').addEventListener('click', () => { Fireworks.salvo(9, 260); const b = $('#salute').getBoundingClientRect(); FX.hearts(b.left + b.width / 2, b.top, 14, PARTY); });
      }
    };
  })();

  /* =============== little joys: double-tap like, easter eggs =============== */
  function joys() {
    let lastT = 0, lastEl = null;
    const like = (box, x, y) => {
      const l = $('.like', box); if (l) { l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop'); }
      FX.hearts(x, y, 16, LOVE, 1.1); Audio_.chime();
    };
    document.addEventListener('pointerup', e => {
      const box = e.target.closest('.hero-photo,.person .photo,.gi'); if (!box) return;
      const now = performance.now();
      if (box === lastEl && now - lastT < 420) { like(box, e.clientX, e.clientY); lastT = 0; lastEl = null; } else { lastT = now; lastEl = box; }
    });
    $$('.hero-photo,.person .photo').forEach(b => b.style.touchAction = 'manipulation');
    $('#gal').style.touchAction = 'pan-x pan-y';
    // tap a countdown tile
    $('#cd').addEventListener('click', e => { const t = e.target.closest('#cd>div'); if (!t) return; const r = t.getBoundingClientRect(); FX.confetti(r.left + r.width / 2, r.top + r.height / 2, 30, [getComputedStyle(t).getPropertyValue('--c').trim(), '#fff', '#ffd166']); Audio_.tick(); });
    // easter egg: tap the A♥A logo five times → shower of hearts
    let taps = [];
    $('#brand').addEventListener('click', () => { const n = performance.now(); taps = taps.filter(t => n - t < 2500).concat(n); if (taps.length >= 5) { taps = []; FX.rain(60); Audio_.chime(); } });
    // vinyl: little hearts when music starts
    $('#vinyl').addEventListener('click', () => { if (!Audio_.music) return; const r = $('#vinyl').getBoundingClientRect(); FX.hearts(r.left + r.width / 2, r.top + r.height / 2, 10, PARTY); });
  }

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
      if (e.target.name === 'attending' && e.target.value === 'yes') { const r = e.target.nextElementSibling.getBoundingClientRect(); FX.hearts(r.left + r.width / 2, r.top, 10); }
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
        if (att === 'yes') { Audio_.finish(); FX.petals(70); setTimeout(() => FX.confetti(innerWidth / 2, innerHeight * .4), 250); }
        else FX.hearts(innerWidth / 2, innerHeight * .5, 8);
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
        ok.hidden = false; w.message.value = ''; Audio_.chime();
        const b = btn.getBoundingClientRect(); FX.hearts(b.left + b.width / 2, b.top, 14);
      } catch (x) { er.textContent = x.message; er.hidden = false; }
      btn.disabled = false;
    });
  }

  /* =============== page chrome =============== */
  function chrome() {
    const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
    burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
    menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
    $('#vinyl').addEventListener('click', () => $('#btnMusic').click());
    new MutationObserver(() => { const on = $('#btnMusic').getAttribute('aria-pressed') === 'true'; document.body.classList.toggle('music-on', on); $('#vinyl').setAttribute('aria-pressed', on); }).observe($('#btnMusic'), { attributes: true, attributeFilter: ['aria-pressed'] });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(e => io.observe(e));
    let ticking = false;
    const loop = () => {
      nav.style.setProperty('--prog', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100) + '%');
      Timeline.frame(); ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
    setInterval(() => { if (!document.hidden) Timeline.frame(); }, 50);
    loop();
  }

  /* =============== boot =============== */
  (async function () {
    try {
      const r = await fetch('/api/site' + (urlCode ? '?g=' + encodeURIComponent(urlCode) : ''), { cache: 'no-store' });
      const j = await r.json(); S = j.settings; guest = j.guest;
    } catch { S = { schedule: [], drinks: [], dressColors: [] }; }
    fill(); countdown(); rsvp(); Timeline.init(); Finish.init(); joys(); chrome(); runIntro();
    if (location.hash.length > 1) setTimeout(() => { const t = document.querySelector(location.hash); t && t.scrollIntoView(); }, 50);
  })();
})();

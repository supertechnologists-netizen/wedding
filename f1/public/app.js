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

  /* =============== TRACK =============== */
  const Track = (() => {
    const svg = $('#trackSvg'), NS = 'http://www.w3.org/2000/svg';
    const paths = {
      land: { vb: [1000, 400], d: 'M70 70H690C830 70 830 200 690 200H310C170 200 170 330 310 330H920' },
      port: { vb: [360, 560], d: 'M60 60H300C350 60 350 170 300 170H60C10 170 10 280 60 280H300C350 280 350 390 300 390H60C10 390 10 500 60 500H300' }
    };
    const FR = [0.04, 0.3, 0.57, 0.8];
    let mode, P, L, stops = [], cur = -1, p = 0, target = 0, shown = false;
    const pa = $('#pAsphalt'), pe = $('#pAsphaltEdge'), pd = $('#pDash'), pdone = $('#pDone'), car = $('#car');
    function build() {
      const box = $('.track-box').getBoundingClientRect();
      const m = box.width / Math.max(box.height, 1) < 1.05 ? 'port' : 'land';
      if (m === mode) return; mode = m;
      const cfg = paths[m]; svg.setAttribute('viewBox', `0 0 ${cfg.vb[0]} ${cfg.vb[1]}`);
      [pa, pe, pd, pdone].forEach(e => e.setAttribute('d', cfg.d));
      P = pa; L = P.getTotalLength(); pdone.style.strokeDasharray = L; pdone.style.strokeDashoffset = L;
      const g = $('#stops'); g.innerHTML = ''; stops = [];
      const items = S.schedule || [];
      items.forEach((it, i) => {
        const fr = items.length === 1 ? .1 : FR[0] + (FR[FR.length - 1] - FR[0]) * i / (items.length - 1);
        const pt = P.getPointAtLength(L * fr), e = document.createElementNS(NS, 'g'); e.setAttribute('class', 'stop');
        e.innerHTML = `<circle class="pulse" cx="${pt.x}" cy="${pt.y}" r="20"/><circle class="ring" cx="${pt.x}" cy="${pt.y}" r="20"/><text class="n" x="${pt.x}" y="${pt.y}">${i + 1}</text><text class="l" x="${pt.x}" y="${pt.y - 40}">${esc(it.title)}</text>`;
        g.appendChild(e); stops.push({ fr, el: e });
      });
      const end = P.getPointAtLength(L), vm = $('#venueMark'), left = end.x > cfg.vb[0] * .5 ? -1 : 1;
      vm.innerHTML = `<g class="venue-flag"><rect x="${end.x + 6}" y="${end.y - 22}" width="44" height="44" fill="url(#chk)"/><path d="M${end.x + 6} ${end.y - 22}v-34" stroke="#fff" stroke-width="3"/><text x="${end.x - 8}" y="${end.y + 52}" text-anchor="end">${esc(S.venueName || 'Фініш')}</text></g>`;
      // checker pattern
      if (!$('#chk')) { const d = svg.querySelector('defs'); d.insertAdjacentHTML('beforeend', '<pattern id="chk" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#fff"/><rect width="11" height="11" fill="#000"/><rect x="11" y="11" width="11" height="11" fill="#000"/></pattern>'); }
      cur = -1; place(p);
    }
    function place(prog) {
      if (!P) return;
      const len = L * prog, pt = P.getPointAtLength(len), a = P.getPointAtLength(Math.max(0, len - 3)), b = P.getPointAtLength(Math.min(L, len + 3));
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      car.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${ang})`);
      pdone.style.strokeDashoffset = L - len;
      let idx = -1; stops.forEach((s, i) => { if (prog >= s.fr - .004) idx = i; });
      if (idx !== cur) {
        const first = cur === -1; cur = idx;
        stops.forEach((s, i) => { s.el.classList.toggle('on', i <= idx); s.el.classList.toggle('cur', i === idx); });
        card(idx, !first);
      }
    }
    function card(idx, anim) {
      const items = S.schedule || [], it = items[Math.max(0, idx)] || {};
      $('#scTime').textContent = idx < 0 ? '🏁' : (it.time || '');
      $('#scTitle').textContent = idx < 0 ? 'Старт' : it.title || '';
      $('#scText').textContent = idx < 0 ? 'Прокручуйте вниз — болід вирушає в путь до місця святкування.' : it.text || '';
      $('#scDots').innerHTML = items.map((_, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('');
      const c = $('#stopCard'); if (anim) { c.classList.remove('swap'); void c.offsetWidth; c.classList.add('swap'); Audio_.stop(); }
    }
    function measure() { const r = $('#route').getBoundingClientRect(); const span = r.height - innerHeight; target = clamp(-r.top / Math.max(span, 1), 0, 1); }
    let lastP = 0;
    function frame() {
      measure(); p += (target - p) * (reduced ? 1 : .12); if (Math.abs(target - p) < .0004) p = target;
      if (P) { place(clamp(p * 1.0, 0, 1)); }
      lastP = p;
    }
    return { init() { build(); addEventListener('resize', () => { build(); }); }, frame, rebuild() { mode = null; build(); } };
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

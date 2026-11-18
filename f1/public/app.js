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

  /* =============== LOADER =============== */
  function runIntro() {
    const intro = $('#intro'), lights = $$('.lights i'), txt = $('#introText');
    let done = false; const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finish = (instant) => {
      if (done) return; done = true; timers.forEach(clearTimeout);
      sess.set('gp_seen', '1');
      document.body.classList.add('go'); document.body.classList.remove('intro-on');
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
  const FLAGS = ['green', 'white', 'yellow', 'blue', 'red'];
  const flagSvg = n => `<svg viewBox="0 0 36 24"><use href="#flag-${n}"/></svg>`;
  const colors = () => (S.dressColors || []).map(c => typeof c === 'string' ? { hex: c, name: '' } : c);
  function photoInto(box, url, alt) {
    if (!url) return;
    const img = new Image(); img.alt = alt; img.loading = 'lazy'; img.src = url; box.prepend(img);
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
    photoInto($('#heroPhoto'), S.heroPhoto || S.couplePhoto, 'Аня та Андрій');
    for (const [id, bio, photo, name] of [['#dBride', S.brideBio, S.bridePhoto, bride], ['#dGroom', S.groomBio, S.groomPhoto, groom]]) {
      const el = $(id); $('.bio', el).textContent = bio || ''; $('h3', el).textContent = name;
      const ph = $('.photo', el); ph.dataset.ph = name.charAt(0); photoInto(ph, photo, name);
    }
    // faces on the car
    [['#face1', S.bridePhoto], ['#face2', S.groomPhoto]].forEach(([id, url]) => { const f = $(id); if (url) { f.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`; f.classList.add('has'); } });
    // route
    $('#routeText').textContent = S.routeText || '';
    $('#tlItems').innerHTML = (S.schedule || []).map((it, i) => `<article class="ti rv" data-i="${i}"><span class="fl">${flagSvg(FLAGS[i % 5])}</span><div class="tm">${esc(it.time || '')}</div><h3>${esc(it.title)}</h3><p>${esc(it.text || '')}</p></article>`).join('');
    // gallery
    const gal = (S.gallery || []).filter(g => g.url || g.caption);
    $('#gallery').hidden = !gal.length;
    $('#gal').innerHTML = gal.map((g, i) => `<figure class="gi">${g.url ? `<img src="${esc(g.url)}" alt="${esc(g.caption)}" loading="lazy">` : ''}${g.caption ? `<figcaption class="cap">${flagSvg(i % 6 === 5 ? 'chk' : FLAGS[i % 5])}${esc(g.caption)}</figcaption>` : ''}</figure>`).join('');
    // dress
    $('#dressText').textContent = S.dressText || ''; $('#dressW').textContent = S.dressWomen || ''; $('#dressM').textContent = S.dressMen || '';
    const sw = $('#swatches');
    sw.innerHTML = colors().map((c, i) => `<div class="sw" role="listitem" tabindex="0" data-i="${i}"><i style="background:${esc(c.hex)}"></i><span>${esc(c.name || c.hex)}</span></div>`).join('');
    const pick = el => { $$('.sw', sw).forEach(x => x.classList.toggle('sel', x === el)); const c = colors()[+el.dataset.i]; $('#swPicked').innerHTML = `Вибраний колір: <b>${esc(c.name || c.hex)}</b> · ${esc(c.hex)}`; Audio_.tick(); };
    sw.addEventListener('click', e => { const el = e.target.closest('.sw'); if (el) pick(el); });
    sw.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sw')) { e.preventDefault(); pick(e.target); } });
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
      let diff = t - Date.now();
      if (diff <= 0) { Object.values(els).forEach(e => e.textContent = '00'); $('#cdNote').textContent = 'Lights out! Гонка триває'; return; }
      const s = Math.floor(diff / 1000), p = n => String(n).padStart(2, '0');
      els.d.textContent = Math.floor(s / 86400); els.h.textContent = p(Math.floor(s % 86400 / 3600)); els.m.textContent = p(Math.floor(s % 3600 / 60)); els.s.textContent = p(s % 60);
      $('#cdNote').textContent = 'До старту гонки залишилось';
    };
    tick(); setInterval(tick, 1000);
  }

  /* =============== CONFETTI =============== */
  const Confetti = (() => {
    const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf = 0;
    const COL = ['#d6001c', '#ffffff', '#1c1b1a', '#b8985a', '#f4e3b5'];
    const size = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
    function tick() {
      cx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(q => { q.vy += .12; q.x += q.vx; q.y += q.vy; q.r += q.vr; q.vx *= .995;
        cx.save(); cx.translate(q.x, q.y); cx.rotate(q.r); cx.fillStyle = q.c; cx.globalAlpha = Math.min(1, q.life / 40); cx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); cx.restore(); q.life--; });
      parts = parts.filter(q => q.life > 0 && q.y < cv.height + 40);
      if (parts.length) raf = requestAnimationFrame(tick); else { cx.clearRect(0, 0, cv.width, cv.height); raf = 0; }
    }
    return { burst(xf = .5, yf = .35) {
      if (reduced) return; size(); const dpr = devicePixelRatio;
      for (let i = 0; i < 150; i++) { const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 9) * dpr;
        parts.push({ x: cv.width * xf, y: cv.height * yf, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5 * dpr, w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 5) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COL[i % COL.length], life: 110 + Math.random() * 80 }); }
      if (!raf) raf = requestAnimationFrame(tick);
    } };
  })();

  /* =============== TIMELINE (dashed line + car with the couple) =============== */
  const Timeline = (() => {
    const tl = $('#tl'), car = $('#car'); let cy = 0, started = false, arrived = false, lastY = 0;
    function place() {
      const items = $$('.ti', tl); if (!items.length) return;
      const r = tl.getBoundingClientRect(), H = r.height, maxY = H - 34;
      const target = clamp(-r.top + innerHeight * .5, 0, maxY);
      if (!started) { cy = target; started = true; }
      cy += (target - cy) * (reduced ? 1 : .12); if (Math.abs(target - cy) < .3) cy = target;
      car.style.transform = `translate3d(0,${cy.toFixed(1)}px,0)`;
      car.classList.toggle('show', r.top < innerHeight && r.bottom > 0);
      items.forEach(it => { const y = it.offsetTop + 22, on = cy >= y - 6; if (on !== it.classList.contains('active')) { it.classList.toggle('active', on); if (on) Audio_.stop(); } });
      const done = cy >= maxY - 3;
      if (done && !arrived) { arrived = true; Audio_.finish(); Confetti.burst(.5, .5); }
      if (!done && cy < maxY - 160) arrived = false;
    }
    return { frame: place, init() { place(); addEventListener('resize', place); } };
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
        Audio_.finish(); Confetti.burst(.5, .4);
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
    $('#vinyl').addEventListener('click', () => $('#btnMusic').click());
    new MutationObserver(() => { const on = $('#btnMusic').getAttribute('aria-pressed') === 'true'; document.body.classList.toggle('music-on', on); $('#vinyl').setAttribute('aria-pressed', on); }).observe($('#btnMusic'), { attributes: true, attributeFilter: ['aria-pressed'] });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach(e => io.observe(e));
    const fin = $('#finish');
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { fin.classList.add('run'); setTimeout(() => Audio_.finish(), 1800); o.disconnect(); } }, { threshold: .35 }).observe(fin);
    let ticking = false;
    const loop = () => {
      nav.style.setProperty('--prog', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100) + '%');
      Timeline.frame(); ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
    setInterval(() => Timeline.frame(), 60);
    loop();
  }

  /* =============== boot =============== */
  (async function () {
    try {
      const r = await fetch('/api/site' + (urlCode ? '?g=' + encodeURIComponent(urlCode) : ''), { cache: 'no-store' });
      const j = await r.json(); S = j.settings; guest = j.guest;
    } catch { S = { schedule: [], drinks: [], dressColors: [] }; }
    fill(); countdown(); rsvp(); Timeline.init(); chrome(); runIntro();
    if (location.hash.length > 1) setTimeout(() => { const t = document.querySelector(location.hash); t && t.scrollIntoView(); }, 50);
  })();
})();

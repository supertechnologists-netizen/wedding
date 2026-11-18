'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let D = null, filter = { q: '', st: '' };
  const api = async (url, method = 'GET', body) => {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !url.includes('login')) { show(false); throw new Error('auth'); }
    if (!r.ok) throw new Error(j.error || 'Помилка');
    return j;
  };
  const toast = t => { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2200); };
  const show = on => { $('#login').classList.toggle('hide', on); $('#app').classList.toggle('hide', !on); };

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); $('#loginErr').textContent = '';
    try { await api('/api/admin/login', 'POST', { password: $('#pw').value }); $('#pw').value = ''; await load(); show(true); } catch (x) { $('#loginErr').textContent = x.message; }
  });
  $('#logout').onclick = async () => { await api('/api/admin/logout', 'POST'); show(false); };
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('main>section').forEach(s => s.classList.toggle('hide', s.id !== 't-' + b.dataset.t)); };

  async function load() { D = await api('/api/admin/data'); render(); }
  function render() { stats(); guests(); wishes(); content(); }
  const link = g => `${location.origin}/?g=${g.code}`;
  const stTag = a => a === 1 ? '<span class="tag y">Прийде</span>' : a === 0 ? '<span class="tag n">Відмова</span>' : '<span class="tag p">Без відповіді</span>';

  /* ---- stats ---- */
  function stats() {
    const s = D.stats, drinks = Object.entries(s.drinks).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...drinks.map(d => d[1]));
    const tot = Math.max(1, s.total), a = s.yes / tot * 100, b = a + s.no / tot * 100;
    $('#t-stats').innerHTML = `
    <div class="tiles">
      <div class="tile"><b>${s.total}</b><span>Усього в списку</span></div>
      <div class="tile g"><b>${s.yes}</b><span>Підтвердили (${s.people} осіб із супутниками)</span></div>
      <div class="tile"><b>${s.no}</b><span>Відмовились</span></div>
      <div class="tile n"><b>${s.pending}</b><span>Ще не відповіли</span></div>
      <div class="tile w"><b>${s.plusOnes}</b><span>З супутником</span></div>
      <div class="tile w"><b>${s.diet}</b><span>З харчовими обмеженнями</span></div>
    </div>
    <div class="grid2">
      <div class="panel"><h3>Відповіді</h3><div class="donut">
        <i style="background:conic-gradient(#35d07f 0 ${a}%,#e10600 ${a}% ${b}%,#55555e ${b}% 100%)"></i>
        <div class="legend"><span style="--c:#35d07f">Прийдуть — ${s.yes}</span><span style="--c:#e10600">Відмови — ${s.no}</span><span style="--c:#55555e">Без відповіді — ${s.pending}</span></div></div></div>
      <div class="panel"><h3>Напої (серед тих, хто прийде)</h3><div class="bars">${drinks.map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><div><i style="width:${v / max * 100}%"></i></div><em>${v}</em></div>`).join('') || '<p style="color:#9a9aa5">Поки немає даних</p>'}</div></div>
    </div>
    <div class="panel"><h3>Харчові побажання</h3>${D.guests.filter(g => g.attending === 1 && g.diet).map(g => `<p><b>${esc(g.name)}</b> — ${esc(g.diet)}</p>`).join('') || '<p style="color:#9a9aa5">Немає</p>'}</div>
    <div class="panel"><h3>Таблиця напоїв по гостях</h3><div class="tw"><table><thead><tr><th>Гість</th>${Object.keys(s.drinks).map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${D.guests.filter(g => g.attending === 1).map(g => `<tr><td>${esc(g.name)}</td>${Object.keys(s.drinks).map(k => `<td>${g.drinks.includes(k) ? '●' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }

  /* ---- guests ---- */
  function guests() {
    const el = $('#t-guests');
    el.innerHTML = `
    <div class="panel"><h3>Додати запрошених</h3>
      <div class="tools"><textarea id="newNames" rows="3" class="grow" placeholder="По одному імені в рядок: Олена Коваленко, родина Мельник…"></textarea>
      <label>Макс. осіб<select id="newMax"><option value="1">1 (без супутника)</option><option value="2" selected>2 (з супутником)</option><option value="4">4 (сім’я)</option></select></label>
      <button class="btn" id="addGuests">Додати та створити посилання</button></div></div>
    <div class="tools"><input class="grow" id="q" placeholder="Пошук за ім’ям…" value="${esc(filter.q)}">
      <select id="st"><option value="">Усі статуси</option><option value="1">Прийдуть</option><option value="0">Відмови</option><option value="n">Без відповіді</option></select>
      <a class="btn sec" href="/api/admin/export.csv">⬇ Експорт CSV (Excel)</a></div>
    <div class="tw"><table><thead><tr><th>Ім’я</th><th>Статус</th><th>Супутник</th><th>Напої</th><th>Харчові</th><th>Дії</th></tr></thead><tbody id="gb"></tbody></table></div>`;
    $('#st').value = filter.st;
    const draw = () => {
      const q = filter.q.toLowerCase();
      const rows = D.guests.filter(g => (!q || g.name.toLowerCase().includes(q)) && (filter.st === '' || (filter.st === 'n' ? g.attending === null : String(g.attending) === filter.st)));
      $('#gb').innerHTML = rows.map(g => `<tr><td><b>${esc(g.name)}</b>${g.invited ? '' : ' <small style="color:#9a9aa5">(за відкритим посиланням)</small>'}<br><small style="color:#9a9aa5">${esc(g.phone)}</small></td>
        <td>${stTag(g.attending)}<br><small style="color:#9a9aa5">${g.respondedAt ? esc(g.respondedAt) : ''}</small></td>
        <td>${g.plusOne ? 'Так' + (g.plusName ? ': ' + esc(g.plusName) : '') : g.attending === 1 ? 'Ні' : '—'}</td>
        <td><div class="dr">${g.drinks.map(d => `<span>${esc(d)}</span>`).join('')}</div></td><td>${esc(g.diet)}</td>
        <td><div class="act"><button class="btn sm sec" data-a="copy" data-id="${g.id}">🔗 Посилання</button><button class="btn sm sec" data-a="edit" data-id="${g.id}">Ред.</button><button class="btn sm danger" data-a="del" data-id="${g.id}">✕</button></div></td></tr>`).join('') || '<tr><td colspan="6" style="color:#9a9aa5">Нічого не знайдено</td></tr>';
    };
    draw();
    $('#q').oninput = e => { filter.q = e.target.value; draw(); }; $('#st').onchange = e => { filter.st = e.target.value; draw(); };
    $('#addGuests').onclick = async () => {
      const names = $('#newNames').value.split('\n').map(s => s.trim()).filter(Boolean); if (!names.length) return;
      try { await api('/api/admin/guests', 'POST', { names, maxParty: +$('#newMax').value }); toast('Додано: ' + names.length); await load(); } catch (x) { toast(x.message); }
    };
    $('#gb').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return; const g = D.guests.find(x => x.id === +b.dataset.id);
      if (b.dataset.a === 'copy') { try { await navigator.clipboard.writeText(link(g)); toast('Посилання скопійовано'); } catch { prompt('Скопіюйте посилання:', link(g)); } }
      if (b.dataset.a === 'del' && confirm(`Видалити «${g.name}»?`)) { await api('/api/admin/guests/' + g.id, 'DELETE'); toast('Видалено'); await load(); }
      if (b.dataset.a === 'edit') editGuest(g);
    };
  }
  function editGuest(g) {
    const d = $('#dlg');
    d.innerHTML = `<form method="dialog" id="ef" style="display:grid;gap:12px"><h3>Редагувати гостя</h3>
      <label>Ім’я<input name="name" value="${esc(g.name)}"></label><label>Телефон<input name="phone" value="${esc(g.phone)}"></label>
      <label>Статус<select name="attending"><option value="">Без відповіді</option><option value="1">Прийде</option><option value="0">Відмова</option></select></label>
      <label>Макс. осіб<input type="number" name="maxParty" min="1" max="10" value="${g.maxParty}"></label>
      <label class="chk" style="display:flex"><input type="checkbox" name="plusOne" ${g.plusOne ? 'checked' : ''}> З супутником</label>
      <label>Ім’я супутника<input name="plusName" value="${esc(g.plusName)}"></label>
      <label>Харчові побажання<textarea name="diet" rows="2">${esc(g.diet)}</textarea></label>
      <div class="chk">${D.settings.drinks.map(x => `<label><input type="checkbox" name="d" value="${esc(x)}" ${g.drinks.includes(x) ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div>
      <label>Особисте посилання<input readonly value="${esc(link(g))}" onclick="this.select()"></label>
      <div class="act"><button class="btn" value="ok">Зберегти</button><button class="btn sec" value="cancel" formnovalidate>Скасувати</button></div></form>`;
    $('select[name=attending]', d).value = g.attending === null ? '' : String(g.attending);
    d.showModal();
    $('#ef').onsubmit = async e => {
      if (e.submitter?.value !== 'ok') return;
      const f = e.target;
      try { await api('/api/admin/guests/' + g.id, 'PUT', { name: f.name.value, phone: f.phone.value, attending: f.attending.value === '' ? null : f.attending.value === '1', maxParty: +f.maxParty.value, plusOne: f.plusOne.checked, plusName: f.plusName.value, diet: f.diet.value, drinks: $$('input[name=d]:checked', f).map(i => i.value) }); toast('Збережено'); await load(); } catch (x) { toast(x.message); }
    };
  }

  /* ---- wishes ---- */
  function wishes() {
    $('#t-wishes').innerHTML = `<h2 style="font-size:32px;margin-bottom:14px">Побажання гостей (${D.wishes.length})</h2>` + (D.wishes.map(w => `<div class="wish"><b>${esc(w.name)}</b> <small>${esc(w.created_at)}</small><p style="white-space:pre-wrap;margin-top:4px">${esc(w.message)}</p><button class="btn sm danger" data-w="${w.id}" style="margin-top:8px">Видалити</button></div>`).join('') || '<p style="color:#9a9aa5">Ще немає повідомлень.</p>');
    $('#t-wishes').onclick = async e => { const b = e.target.closest('[data-w]'); if (b && confirm('Видалити повідомлення?')) { await api('/api/admin/wishes/' + b.dataset.w, 'DELETE'); await load(); } };
  }

  /* ---- content ---- */
  function content() {
    const s = D.settings;
    const photo = (k, label) => `<div class="full"><label>${label}<div class="imgup"><img src="${esc(s[k] || '')}" alt="" onerror="this.style.visibility='hidden'"><input name="${k}" value="${esc(s[k] || '')}" placeholder="URL або завантажте файл"><label class="btn sec sm" style="display:inline-grid;color:#fff;cursor:pointer">Файл<input type="file" accept="image/*" data-up="${k}" hidden></label></div></label></div>`;
    $('#t-content').innerHTML = `<form id="cf" class="panel form2">
      <h3 class="full">Основне</h3>
      <label>Ім’я нареченої<input name="bride" value="${esc(s.bride)}"></label><label>Ім’я нареченого<input name="groom" value="${esc(s.groom)}"></label>
      <label>Дата і час весілля<input type="datetime-local" name="eventDate" value="${esc((s.eventDate || '').slice(0, 16))}"></label>
      <label>Відповісти до<input type="date" name="rsvpDeadline" value="${esc(s.rsvpDeadline)}"></label>
      <label>Місце (назва)<input name="venueName" value="${esc(s.venueName)}"></label><label>Адреса<input name="venueAddress" value="${esc(s.venueAddress)}"></label>
      <label class="full">Посилання на карту (Google Maps тощо)<input name="mapUrl" value="${esc(s.mapUrl)}"></label>
      <label class="full">Історія / вступ<textarea name="story" rows="3">${esc(s.story)}</textarea></label>
      <label>Про Аню<textarea name="brideBio" rows="4">${esc(s.brideBio)}</textarea></label><label>Про Андрія<textarea name="groomBio" rows="4">${esc(s.groomBio)}</textarea></label>
      <h3 class="full">Фото</h3>${photo('bridePhoto', 'Фото Ані')}${photo('groomPhoto', 'Фото Андрія')}${photo('couplePhoto', 'Спільне фото')}${photo('heroPhoto', 'Фон головного екрана')}
      <label class="full">Музика (URL mp3; порожньо = вбудована гоночна мелодія)<input name="musicUrl" value="${esc(s.musicUrl)}"></label>
      <h3 class="full">Дрес-код</h3>
      <label class="full">Опис<textarea name="dressText" rows="2">${esc(s.dressText)}</textarea></label>
      <label>Для неї<textarea name="dressWomen" rows="3">${esc(s.dressWomen)}</textarea></label><label>Для нього<textarea name="dressMen" rows="3">${esc(s.dressMen)}</textarea></label>
      <div class="full"><label>Кольори дрес-коду (кружечки на сайті)</label><div class="colors" id="colors"></div></div>
      <h3 class="full">Галерея (фото з підписами-прапорцями)</h3>
      <div class="full sched" id="galList"></div>
      <h3 class="full">Програма дня (етапи маршруту)</h3>
      <div class="full sched" id="sched"></div><div class="full"><button type="button" class="btn sec sm" id="addStop">+ Додати етап</button></div>
      <h3 class="full">Напої в RSVP (список для гостей)</h3>
      <label class="full">По одному в рядок<textarea name="drinks" rows="9">${esc(s.drinks.join('\n'))}</textarea></label>
      <div class="full act"><button class="btn">Зберегти зміни</button><span class="ok" id="saved"></span></div></form>`;
    const normC = l => l.map(c => typeof c === 'string' ? { hex: c, name: '' } : c);
    const colors = () => $('#colors');
    const readC = () => $$('.crow', colors()).map(r => ({ hex: $('input[type=color]', r).value, name: $('input[type=text]', r).value }));
    const drawColors = list => {
      colors().innerHTML = list.map((c, i) => `<div class="crow"><input type="color" value="${esc(c.hex)}"><input type="text" placeholder="Назва кольору" value="${esc(c.name)}"><button type="button" class="btn sm danger" data-rc="${i}">✕</button></div>`).join('') + '<div><button type="button" class="btn sec sm" id="addC">+ Додати колір</button></div>';
      $('#addC').onclick = () => drawColors([...readC(), { hex: '#ffffff', name: '' }]);
    };
    drawColors(normC(s.dressColors));
    colors().onclick = e => { const b = e.target.closest('[data-rc]'); if (b) { const l = readC(); l.splice(+b.dataset.rc, 1); drawColors(l); } };
    const gal = () => $('#galList');
    const readG = () => $$('.grow', gal()).map(r => ({ url: $('input[name=gu]', r).value, caption: $('input[name=gc]', r).value }));
    const drawGal = list => {
      gal().innerHTML = list.map((g, i) => `<div class="grow"><img src="${esc(g.url)}" alt="" onerror="this.style.visibility='hidden'"><input name="gc" placeholder="Підпис (напр. Pole position)" value="${esc(g.caption)}"><input name="gu" placeholder="URL фото" value="${esc(g.url)}"><label class="btn sec sm" style="display:inline-grid;color:#fff;cursor:pointer">Файл<input type="file" accept="image/*" data-gup="${i}" hidden></label><button type="button" class="btn sm danger" data-rg="${i}">✕</button></div>`).join('') + '<div><button type="button" class="btn sec sm" id="addG">+ Додати фото</button></div>';
      $('#addG').onclick = () => drawGal([...readG(), { url: '', caption: '' }]);
    };
    drawGal(s.gallery || []);
    gal().onclick = e => { const b = e.target.closest('[data-rg]'); if (b) { const l = readG(); l.splice(+b.dataset.rg, 1); drawGal(l); } };
    gal().addEventListener('change', e => {
      const fi = e.target.closest('[data-gup]'); if (!fi || !fi.files[0]) return;
      const fr = new FileReader(); fr.onload = async () => { try { const j = await api('/api/admin/upload', 'POST', { data: fr.result }); const l = readG(); l[+fi.dataset.gup].url = j.url; drawGal(l); toast('Файл завантажено — натисніть «Зберегти»'); } catch (x) { toast(x.message); } };
      fr.readAsDataURL(fi.files[0]);
    });
    const drawSched = list => {
      $('#sched').innerHTML = list.map((x, i) => `<div class="row"><input placeholder="14:30" value="${esc(x.time)}"><input placeholder="Назва" value="${esc(x.title)}"><input placeholder="Опис" value="${esc(x.text)}"><button type="button" class="btn sm danger" data-rm="${i}">✕</button></div>`).join('');
    };
    const readSched = () => $$('#sched .row').map(r => { const i = $$('input', r); return { time: i[0].value, title: i[1].value, text: i[2].value }; });
    drawSched(s.schedule);
    $('#addStop').onclick = () => drawSched([...readSched(), { time: '', title: '', text: '' }]);
    $('#sched').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { const l = readSched(); l.splice(+b.dataset.rm, 1); drawSched(l); } };
    $('#cf').addEventListener('change', async e => {
      const fi = e.target.closest('[data-up]'); if (!fi || !fi.files[0]) return;
      const fr = new FileReader(); fr.onload = async () => {
        try { const j = await api('/api/admin/upload', 'POST', { data: fr.result }); const inp = $(`input[name=${fi.dataset.up}]`); inp.value = j.url; inp.closest('.imgup').querySelector('img').src = j.url; inp.closest('.imgup').querySelector('img').style.visibility = 'visible'; toast('Файл завантажено — натисніть «Зберегти»'); } catch (x) { toast(x.message); }
      }; fr.readAsDataURL(fi.files[0]);
    });
    $('#cf').onsubmit = async e => {
      e.preventDefault(); const f = e.target, body = { schedule: readSched(), dressColors: readC(), gallery: readG(), drinks: f.drinks.value.split('\n') };
      for (const k of ['bride', 'groom', 'eventDate', 'rsvpDeadline', 'venueName', 'venueAddress', 'mapUrl', 'story', 'brideBio', 'groomBio', 'bridePhoto', 'groomPhoto', 'couplePhoto', 'heroPhoto', 'musicUrl', 'dressText', 'dressWomen', 'dressMen']) body[k] = f[k].value;
      if (body.eventDate.length === 16) body.eventDate += ':00';
      try { const j = await api('/api/admin/settings', 'PUT', body); D.settings = j.settings; toast('Збережено ✓'); } catch (x) { toast(x.message); }
    };
  }

  api('/api/admin/me').then(async r => { if (r.admin) { await load(); show(true); } }).catch(() => { });
})();

/** @OnlyCurrentDoc */
/**
 * Приёмник анкеты RSVP. Вставить в Google Таблицу: Расширения → Apps Script.
 * @OnlyCurrentDoc выше ограничивает доступ скрипта одной этой таблицей.
 *
 * doPost — сайт присылает ответ, строка добавляется в лист «Відповіді».
 * doGet  — отдаёт все ответы в JSON для дашборда guests.html, только с верным ключом.
 */
var VERSION = 2;  // должна совпадать с SCRIPT_VERSION в guests.html
var SHEET_NAME = 'Відповіді';
// Секретный ключ дашборда. В репозитории — заглушка, настоящий ключ вписывается только в Apps Script.
var DASHBOARD_KEY = 'ВСТАВТЕ_КЛЮЧ';
var HEADERS = ['Час', 'Ім’я', 'Телефон', 'Чи буде', 'Скільки осіб', 'Напої', 'Коментар'];

// Защита от спама
var MAX_ROWS = 3000;              // больше ответов на свадьбу не бывает
var MAX_PER_10_MIN = 100;         // всего ответов за 10 минут
var MAX_PER_PHONE_PER_HOUR = 5;   // повторных ответов с одного номера за час

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    var first = ss.getSheets()[0];
    sheet = first.getLastRow() === 0 ? first.setName(SHEET_NAME) : ss.insertSheet(SHEET_NAME, 0);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else {
    // Лист из первой версии скрипта: добавить колонку «Телефон» после имени
    var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (head.indexOf('Телефон') < 0) {
      sheet.insertColumnAfter(2);
      sheet.getRange(1, 3).setValue('Телефон');
    }
  }
  // Таблицу правит только скрипт: при ручной правке Google предупредит
  if (sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).length === 0) {
    sheet.protect().setDescription('Заповнюється автоматично з сайту. Не редагуйте вручну.').setWarningOnly(true);
  }
  return sheet;
}

function clean_(v, max) {
  // Обрезаем длину и не даём значению выполниться как формула в таблице
  v = String(v || '').replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function phoneKey_(phone) {
  // Последние 9 цифр: +380 67 123 45 67 и 067-123-45-67 — один номер
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function hit_(cache, key, limit, seconds) {
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), seconds);
  return n > limit;
}

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Ловушка для ботов: поле скрыто от людей, боты его заполняют. Делаем вид, что всё хорошо.
  if (p.website) return json_({ ok: true });

  var name = clean_(p.name, 100);
  var digits = String(p.phone || '').replace(/\D/g, '');
  var attend = p.attend === 'yes' ? 'yes' : p.attend === 'no' ? 'no' : '';
  if (!name || !attend || digits.length < 9 || digits.length > 15) {
    return json_({ ok: false, error: 'invalid' });
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'busy' });
  try {
    var cache = CacheService.getScriptCache();
    if (hit_(cache, 'all', MAX_PER_10_MIN, 600) ||
        hit_(cache, 'ph' + phoneKey_(digits), MAX_PER_PHONE_PER_HOUR, 3600)) {
      return json_({ ok: false, error: 'rate' });
    }
    var sheet = getSheet_();
    if (sheet.getLastRow() > MAX_ROWS) return json_({ ok: false, error: 'full' });

    var yes = attend === 'yes';
    var row = {
      'Час': new Date(),
      'Ім’я': name,
      // Только цифры, +, пробелы, скобки, дефисы; апостроф — хранить как текст, не как число
      'Телефон': "'" + String(p.phone).replace(/[^\d+()\s-]/g, '').trim().slice(0, 30),
      'Чи буде': yes ? 'Так' : 'Ні',
      'Скільки осіб': yes ? (p.guests === '2' ? 2 : 1) : '',
      'Напої': yes ? clean_(p.drinks, 200) : '',
      'Коментар': clean_(p.note, 500)
    };
    var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(head.map(function (h) { return h in row ? row[h] : ''; }));
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

function doGet(e) {
  var key = (e && e.parameter && e.parameter.key) || '';
  if (DASHBOARD_KEY === 'ВСТАВТЕ_КЛЮЧ' || key !== DASHBOARD_KEY) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  var values = getSheet_().getDataRange().getValues();
  var head = values.shift();
  // Колонки ищем по названию, а не по номеру — так дашборд не ломается от их перестановки
  var col = function (name) { return head.indexOf(name); };
  var c = { time: col('Час'), name: col('Ім’я'), phone: col('Телефон'), attend: col('Чи буде'),
            guests: col('Скільки осіб'), drinks: col('Напої'), note: col('Коментар') };
  var get = function (r, i) { return i < 0 ? '' : r[i]; };
  return json_({
    ok: true,
    version: VERSION,
    rows: values.map(function (r) {
      var t = get(r, c.time);
      return {
        time: t instanceof Date ? t.toISOString() : String(t),
        name: String(get(r, c.name)),
        phone: String(get(r, c.phone)),
        attend: get(r, c.attend) === 'Так',
        guests: Number(get(r, c.guests)) || 0,
        drinks: String(get(r, c.drinks)),
        note: String(get(r, c.note))
      };
    })
  });
}

/** @OnlyCurrentDoc */
/**
 * Приёмник анкеты сайта «Хрещення Даміра». Вставить в НОВУЮ Google Таблицу
 * (не свадебную): Расширения → Apps Script. Инструкция — damir/README.md.
 *
 * doPost — сайт присылает ответ, строка добавляется в лист «Відповіді».
 */
var SHEET_NAME = 'Відповіді';
var HEADERS = ['Час', 'Ім’я та прізвище', 'Чи буде', 'Супровід', 'Ім’я гостя', 'Побажання / обмеження'];

// Защита от спама
var MAX_ROWS = 2000;
var MAX_PER_10_MIN = 100;        // всего ответов за 10 минут
var MAX_PER_NAME_PER_HOUR = 5;   // повторных ответов с одним именем за час

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
  }
  return sheet;
}

function clean_(v, max) {
  // Обрезаем длину и не даём значению выполниться как формула в таблице
  v = String(v || '').replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
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

  // Ловушка для ботов: поле скрыто от людей. Делаем вид, что всё хорошо.
  if (p.website) return json_({ ok: true });

  var name = clean_(p.name, 100);
  var attend = p.attend === 'yes' ? 'yes' : p.attend === 'no' ? 'no' : '';
  var yes = attend === 'yes';
  var plus = yes && p.company === 'plus';
  var guest = plus ? clean_(p.guest, 100) : '';
  if (!name || !attend || (yes && p.company !== 'alone' && !plus) || (plus && !guest)) {
    return json_({ ok: false, error: 'invalid' });
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'busy' });
  try {
    var cache = CacheService.getScriptCache();
    var nameKey = 'n' + Utilities.base64Encode(Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5, name.toLowerCase(), Utilities.Charset.UTF_8));
    if (hit_(cache, 'all', MAX_PER_10_MIN, 600) || hit_(cache, nameKey, MAX_PER_NAME_PER_HOUR, 3600)) {
      return json_({ ok: false, error: 'rate' });
    }
    var sheet = getSheet_();
    if (sheet.getLastRow() > MAX_ROWS) return json_({ ok: false, error: 'full' });

    sheet.appendRow([
      new Date(),
      name,
      yes ? 'Так' : 'Ні',
      yes ? (plus ? 'З супроводом' : 'Сам/сама') : '',
      guest,
      yes ? clean_(p.wishes, 500) : ''
    ]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

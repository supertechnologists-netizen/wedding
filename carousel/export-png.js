/*
  Збереження всіх слайдів у PNG 1080 × 1350 без браузера вручну.
  Потрібно: Node.js і Playwright (npm i playwright && npx playwright install chromium).
  Запуск із папки carousel:  node export-png.js
  Результат: папка png/ з п'ятьма файлами.
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const names = ['01-golovnyi', '02-pryklad-saitu', '03-podii', '04-perevahy', '05-dyrect'];

const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  const out = path.join(root, 'png');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (let i = 1; i <= 5; i++) {
    await page.goto(`http://localhost:${port}/index.html?slide=${i}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(out, `slide-${names[i - 1]}.png`);
    await page.locator('.holder.active .slide').screenshot({ path: file });
    console.log('✓', path.relative(root, file));
  }
  await browser.close();
  server.close();
});

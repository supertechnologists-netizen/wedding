// Експорт слайдів: PNG для соцмереж (1080 px) + PDF для друку.
//   node render.mjs            — усі формати
//   node render.mjs post       — лише один формат (post | square | story)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
// PW=/шлях/до/playwright — якщо playwright встановлено глобально, а не в папці.
const { chromium } = require(process.env.PW || 'playwright');

const dir = import.meta.dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(dir) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const formats = { post: [1080, 1350], square: [1080, 1080], story: [1080, 1920] };
const names = ['01-oblozhka', '02-portfolio', '03-shcho-vsered', '04-kontakty'];
const only = process.argv[2];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
// Google Fonts офлайн не потрібні — шрифти лежать у fonts/.
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

for (const [f, [w, h]] of Object.entries(formats)) {
  if (only && only !== f) continue;
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${base}/slides.html?f=${f}&export`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.join(dir, 'out', f), { recursive: true });
  const slides = page.locator('.slide');
  for (let i = 0; i < await slides.count(); i++) {
    await slides.nth(i).screenshot({ path: path.join(dir, 'out', f, `${names[i]}.png`) });
  }
  fs.mkdirSync(path.join(dir, 'out', 'print'), { recursive: true });
  await page.pdf({ path: path.join(dir, 'out', 'print', `slides-${f}.pdf`), width: `${w}px`, height: `${h}px`, printBackground: true });
  console.log('✓', f);
}
await browser.close();
server.close();

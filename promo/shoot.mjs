// Знімає реальні скриншоти першого сайту (../index.html) у мобільному вʼюпорті.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
// Google Fonts недоступні з headless-браузера: підставляємо локальні копії (promo/fonts).
const fs = await import('node:fs');
const fontDir = path.join(import.meta.dirname, 'fonts');
const fontCss = fs.readFileSync(path.join(fontDir, 'fonts.css'), 'utf8')
  .replace(/url\(([^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, f)).toString('base64')})`);
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.request().url().includes('googleapis') ? r.fulfill({ contentType: 'text/css', body: fontCss }) : r.abort());
await p.goto('file://' + root + '/index.html', { waitUntil: 'networkidle' });
await p.addStyleTag({ content: `*{animation:none!important;transition:none!important}
 body::after{display:none!important}
 .rings{fill:none;stroke:currentColor;stroke-width:.6} [data-reveal],.thread{opacity:1!important;transform:none!important;filter:none!important}` });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
await p.screenshot({ path: 'shots/hero.png' });
for (const id of ['invite', 'day', 'dress', 'rsvp', 'finale']) {
  await p.locator('#' + id).screenshot({ path: `shots/${id}.png` });
}
await p.screenshot({ path: 'shots/full.png', fullPage: true });
await b.close();

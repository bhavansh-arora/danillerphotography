// Draws the social share images (assets/og/<page>.jpg, 1200x630) from each page's
// headline and photo. Run after changing a headline or the "og" image of a page:
//   node _build/og.cjs        (needs Playwright + Chromium)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, '_build', 'pages');
const OUT = path.join(ROOT, 'assets', 'og');
fs.mkdirSync(OUT, { recursive: true });
const font = f => 'file://' + path.join(ROOT, 'assets', 'fonts', f);
const LOGO = '<svg viewBox="0 0 48 48" width="34" height="34"><g fill="#e9a688"><circle cx="24" cy="24" r="7"/>' +
  Array.from({ length: 12 }, (_, i) => `<rect x="22.4" y="2" width="3.2" height="10" rx="1.6" transform="rotate(${i * 30} 24 24)"/>`).join('') + '</g></svg>';

(async () => {
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const fn of fs.readdirSync(PAGES).filter(f => f.endsWith('.html'))) {
  const src = fs.readFileSync(path.join(PAGES, fn), 'utf8');
  const meta = Object.fromEntries((src.match(/<!--meta\n([\s\S]*?)\n-->/)[1]).split('\n').filter(l => l.includes(': ')).map(l => [l.slice(0, l.indexOf(': ')), l.slice(l.indexOf(': ') + 2)]));
  const slug = fn.replace('.html', '');
  let title = slug === 'index' ? 'Joy, reflected by <em>love.</em>' : (src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, 'Daniller Photography'])[1];
  title = title.replace(/<(?!\/?em\b)[^>]+>/g, '').replace(/class="[^"]*"/g, '');
  const img = 'file://' + path.join(ROOT, 'assets', 'img', `${meta.og && meta.og !== 'index' ? meta.og : 'hero-jump'}-1600.webp`);
  const doc = `<!doctype html><html><head><style>
    @font-face{font-family:IT;src:url(${font('inter-tight.woff2')});font-weight:300 700}
    @font-face{font-family:IS;font-style:italic;src:url(${font('instrument-serif-italic.woff2')})}
    @font-face{font-family:GM;src:url(${font('geist-mono.woff2')})}
    body{margin:0;width:1200px;height:630px;background:#1b1714;font-family:IT;color:#fbf8f3;overflow:hidden}
    .ph{position:absolute;inset:18px;border-radius:28px;overflow:hidden}
    .ph img{width:100%;height:100%;object-fit:cover}
    .ph:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(10,8,6,.92),rgba(10,8,6,.35) 55%,rgba(10,8,6,.15)),linear-gradient(90deg,rgba(10,8,6,.55),rgba(10,8,6,0) 70%)}
    .in{position:absolute;left:66px;right:66px;bottom:58px;z-index:2}
    .top{position:absolute;left:66px;top:56px;z-index:2;display:flex;align-items:center;gap:12px;font-weight:600;font-size:24px;letter-spacing:-.03em}
    .top em{font-family:IS;font-weight:400;color:#cfc4b6;font-size:26px}
    h1{margin:0;font-weight:500;font-size:96px;line-height:.9;letter-spacing:-.06em;max-width:15ch}
    h1 em{font-family:IS;font-weight:400;font-style:italic;letter-spacing:-.02em;color:#e9a688}
    p{margin:26px 0 0;font-family:GM;font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:rgba(251,248,243,.8)}
  </style></head><body><div class="ph"><img src="${img}"></div>
  <div class="top">${LOGO}<span>Daniller <em>Photography</em></span></div>
  <div class="in"><h1>${title}</h1><p>Playful documentary photography &middot; San Francisco</p></div></body></html>`;
  // Load from a real file so the local photo and fonts are allowed to load
  const tmp = path.join(require('os').tmpdir(), 'dp-og.html');
  fs.writeFileSync(tmp, doc);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, slug + '.jpg'), type: 'jpeg', quality: 84 });
  console.log('og', slug);
}
await browser.close();
})();

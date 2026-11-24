#!/usr/bin/env python3
"""Tiny static builder for the Daniller Photography site.

Pages live in _build/pages/*.html. Each starts with a meta comment:

    <!--meta
    title: Page title
    desc: Meta description
    nav: city-hall
    body: page-city-hall
    -->

Shortcode for images (adds srcset, sizes, width/height, lazy loading):

    {{img name|Alt text|extra attributes}}

Put the word `eager` in the extra attributes for above-the-fold images.
Run:  python3 _build/build.py   (outputs the .html files to the site root)
"""
import os, re, html
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, "_build", "pages")
IMG = os.path.join(ROOT, "assets", "img")
VER = "1.0.0"

NAV = [
    ("city-hall", "city-hall.html", "City Hall", "ch-doors-burst"),
    ("weddings", "weddings.html", "Weddings", "nicasio-twirl"),
    ("family", "family.html", "Family", "fam-jump-cat"),
    ("about", "about.html", "Meet Lydia", "lydia-cats"),
    ("kind-words", "kind-words.html", "Kind Words", "dance-circle"),
    ("faq", "faq.html", "FAQ", "ch-staircase"),
]

_dims = {}
def dims(name):
    if name not in _dims:
        with Image.open(os.path.join(IMG, f"{name}-1600.webp")) as im:
            _dims[name] = im.size
    return _dims[name]

def img(name, alt="", extra=""):
    w, h = dims(name)
    eager = "eager" in extra.split()
    extra = " ".join(t for t in extra.split(" ") if t != "eager") if eager else extra
    sizes = "(max-width: 760px) 100vw, 60vw"
    m = re.search(r'sizes="([^"]+)"', extra)
    if m:
        sizes = m.group(1); extra = extra.replace(m.group(0), "")
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="assets/img/{name}-1600.webp" '
            f'srcset="assets/img/{name}-800.webp 800w, assets/img/{name}-1600.webp 1600w" '
            f'sizes="{sizes}" width="{w}" height="{h}" alt="{html.escape(alt, quote=True)}" '
            f'{load} decoding="async" {extra.strip()}>').replace(" >", ">")

LOGO = '''<svg class="logo__mark" viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><circle cx="24" cy="24" r="7"/><g class="logo__rays">''' + "".join(
    f'<rect x="22.4" y="2" width="3.2" height="10" rx="1.6" transform="rotate({a} 24 24)"/>' for a in range(0, 360, 30)
) + '''</g></g></svg>'''

def header(active):
    links = "".join(
        f'<li><a href="{href}" class="hdr__link{" is-active" if key == active else ""}"'
        f'{" aria-current=\"page\"" if key == active else ""}>{label}</a></li>'
        for key, href, label, _ in NAV
    )
    menu_links = "".join(
        f'<li><a href="{href}" class="menu__link" data-preview="assets/img/{im}-800.webp">'
        f'<span class="menu__num">0{i+1}</span><span class="menu__txt">{label}</span></a></li>'
        for i, (key, href, label, im) in enumerate(NAV)
    )
    return f'''
<a class="skip" href="#main">Skip to content</a>
<div class="transition" aria-hidden="true"><div class="transition__panel"><span>{LOGO}</span></div></div>
<div class="cursor" aria-hidden="true"><span class="cursor__label"></span></div>
<header class="hdr" data-hdr>
  <a class="logo" href="index.html" aria-label="Daniller Photography, home">{LOGO}<span class="logo__word">Daniller<small>Photography &middot; San Francisco</small></span></a>
  <nav class="hdr__nav" aria-label="Primary"><ul>{links}</ul></nav>
  <div class="hdr__actions">
    <a class="btn btn--sm btn--poppy hdr__cta" href="contact.html" data-magnetic><span>Check your date</span><i class="btn__dot" aria-hidden="true"></i></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-btn><span class="menu-btn__lines" aria-hidden="true"><i></i><i></i></span><span class="menu-btn__txt">Menu</span></button>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true" data-menu>
  <div class="menu__inner">
    <div class="menu__preview" aria-hidden="true"><img src="assets/img/ch-doors-burst-800.webp" alt="" width="533" height="800"></div>
    <nav class="menu__nav" aria-label="Menu"><ul>
      <li><a href="index.html" class="menu__link" data-preview="assets/img/hero-jump-800.webp"><span class="menu__num">00</span><span class="menu__txt">Home</span></a></li>
      {menu_links}
      <li><a href="contact.html" class="menu__link menu__link--cta" data-preview="assets/img/lips-mural-800.webp"><span class="menu__num">07</span><span class="menu__txt">Let&rsquo;s do this</span></a></li>
    </ul></nav>
    <div class="menu__foot">
      <div><span class="label">Say hello</span><a href="mailto:lydia@danillerphotography.com">lydia@danillerphotography.com</a></div>
      <div><span class="label">Based in</span><span>San Francisco &amp; Los Angeles</span></div>
      <div><span class="label">Follow</span><span><a href="https://www.instagram.com/danillerphotography/" target="_blank" rel="noopener">Instagram</a> &middot; <a href="https://www.facebook.com/DanillerPhotography/" target="_blank" rel="noopener">Facebook</a></span></div>
    </div>
  </div>
</div>
<a class="mobile-cta" href="contact.html" data-mobile-cta><span>Check your date</span><em>Reply within 24h</em></a>
'''

FOOTER = '''
<footer class="ftr">
  <div class="ftr__cta wrap">
    <div class="ftr__cta-l">
      <p class="label label--light"><i class="dot"></i>Now booking 2026 &amp; 2027</p>
      <a href="contact.html" class="ftr__big" data-cursor="Say hi">
        <span class="ftr__big-line">Let&rsquo;s do</span>
        <span class="ftr__big-line"><em>this.</em> <span class="ftr__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19 19 5M8 5h11v11" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span></span>
      </a>
      <p class="ftr__sub">I create custom packages based on what you need and what&rsquo;s important to you.</p>
    </div>
    <div class="ftr__stack">
      <div class="ftr__card">
        <div class="ftr__card-img">%LYDIA%</div>
        <div><h3>Every enquiry is read by me, <em>personally.</em></h3><p>Usually within 24 hours, if not sooner.</p></div>
        <div class="btn-row"><a class="btn btn--poppy" href="contact.html" data-magnetic><span>Start your enquiry</span><i class="btn__dot"></i></a></div>
        <div class="ftr__meta"><div><b>24h</b><span>reply time</span></div><div><b>100+</b><span>City Hall weddings</span></div><div><b>20 yrs</b><span>experience</span></div></div>
      </div>
    </div>
  </div>
  <div class="ftr__strip" aria-hidden="true">
    <div class="ftr__strip-track">
      %STRIP%
    </div>
  </div>
  <div class="ftr__grid wrap">
    <div class="ftr__col ftr__col--brand">
      <a class="logo logo--light" href="index.html" aria-label="Daniller Photography, home">''' + LOGO + '''<span class="logo__word">Daniller<small>Photography &middot; San Francisco</small></span></a>
      <p>Playful documentary photography for weddings, City Hall ceremonies and families, across the Bay Area, Los Angeles and wherever love takes you.</p>
    </div>
    <div class="ftr__col">
      <span class="label label--light">Explore</span>
      <ul><li><a href="city-hall.html">City Hall</a></li><li><a href="weddings.html">Weddings</a></li><li><a href="family.html">Family</a></li><li><a href="about.html">Meet Lydia</a></li><li><a href="kind-words.html">Kind Words</a></li><li><a href="faq.html">FAQ</a></li></ul>
    </div>
    <div class="ftr__col">
      <span class="label label--light">Contact</span>
      <ul><li><a href="mailto:lydia@danillerphotography.com">lydia@danillerphotography.com</a></li><li><a href="contact.html">Enquiry form</a></li><li><a href="https://www.instagram.com/danillerphotography/" target="_blank" rel="noopener">Instagram &#8599;</a></li><li><a href="https://www.facebook.com/DanillerPhotography/" target="_blank" rel="noopener">Facebook &#8599;</a></li></ul>
    </div>
    <div class="ftr__col ftr__col--news">
      <span class="label label--light">Occasional letters</span>
      <p>Updates and special offerings, no spam.</p>
      <form class="news" data-news novalidate>
        <label class="sr-only" for="news-email">Email address</label>
        <input id="news-email" type="email" name="email" placeholder="you@email.com" autocomplete="email" required>
        <button type="submit" aria-label="Subscribe"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
        <span class="news__msg" role="status" aria-live="polite"></span>
      </form>
    </div>
  </div>
  <div class="ftr__word" aria-hidden="true">Daniller</div>
  <div class="ftr__base wrap">
    <span>&copy; <span data-year>2026</span> Daniller Photography</span>
    <span>San Francisco Bay Area &middot; Los Angeles &middot; Worldwide</span>
    <a href="#top" data-to-top>Back to top &uarr;</a>
  </div>
</footer>
'''

STRIP_IMGS = ["ch-doors-burst", "groomsmen-jump", "lips-mural", "fam-jump-cat", "ch-chihuahuas", "picnic-laugh",
              "nicasio-twirl", "cake-kid", "ch-fistbump", "red-umbrella", "fam-upside", "heart-mural"]

HEAD_SCRIPT = """<script>(function(d){d.classList.replace('no-js','js');try{if(sessionStorage.getItem('dp-nav'))d.classList.add('is-entering');if(sessionStorage.getItem('dp-pre'))d.classList.add('no-pre')}catch(e){}})(document.documentElement)</script>"""

def page(meta, body):
    strip = "".join(f'<figure>{img(n, "", "sizes=\"220px\"")}</figure>' for n in STRIP_IMGS * 2)
    title = meta["title"]
    lydia = img('lydia-cats', 'Lydia Daniller', 'sizes="120px"')
    return f'''<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{meta['desc']}">
<meta name="theme-color" content="#15110E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Daniller Photography">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['desc']}">
<meta property="og:image" content="assets/img/{meta.get('og', 'hero-jump')}-1600.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..800,0..100,0..1;1,9..144,300..800,0..100,0..1&family=Inter+Tight:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="assets/css/style.css?v={VER}">
{HEAD_SCRIPT}
{meta.get('head', '')}
</head>
<body class="{meta.get('body', '')}" id="top">
{header(meta.get('nav', ''))}
<main id="main">
{body}
</main>
{FOOTER.replace('%STRIP%', strip).replace('%LYDIA%', lydia)}
<div class="lightbox" data-lightbox-ui aria-hidden="true" role="dialog" aria-label="Image viewer">
  <button class="lightbox__close" type="button" aria-label="Close" data-lb-close>&times;</button>
  <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous image" data-lb-prev>&larr;</button>
  <figure class="lightbox__fig"><img alt="" data-lb-img><figcaption data-lb-cap></figcaption></figure>
  <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next image" data-lb-next>&rarr;</button>
  <span class="lightbox__count" data-lb-count></span>
</div>
<script src="assets/vendor/gsap.min.js"></script>
<script src="assets/vendor/ScrollTrigger.min.js"></script>
<script src="assets/vendor/lenis.min.js"></script>
<script src="assets/js/main.js?v={VER}"></script>
</body>
</html>
'''

META_RE = re.compile(r"<!--meta\n(.*?)\n-->\n?", re.S)
IMG_RE = re.compile(r"\{\{img ([a-z0-9-]+)\|([^|}]*)(?:\|([^}]*))?\}\}")

def build():
    for fn in sorted(os.listdir(PAGES)):
        if not fn.endswith(".html"):
            continue
        src = open(os.path.join(PAGES, fn), encoding="utf-8").read()
        m = META_RE.match(src)
        meta = dict(l.split(": ", 1) for l in m.group(1).splitlines() if ": " in l)
        body = src[m.end():]
        body = IMG_RE.sub(lambda mm: img(mm.group(1), mm.group(2), mm.group(3) or ""), body)
        out = page(meta, body)
        open(os.path.join(ROOT, fn), "w", encoding="utf-8").write(out)
        print("built", fn)

if __name__ == "__main__":
    build()

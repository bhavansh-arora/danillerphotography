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
import os, re, html, json
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, "_build", "pages")
IMG = os.path.join(ROOT, "assets", "img")
VER = "3.0.0"
SITE_URL = "https://danillerphotography.codebunny.net/"

# Site config. While formEndpoint is empty, the enquiry opens a pre-filled email.
CONFIG = {"email": "lydia@danillerphotography.com", "formEndpoint": ""}

NAV = [
    ("city-hall", "city-hall.html", "City Hall", "ch-doors-burst"),
    ("weddings", "weddings.html", "Weddings", "nicasio-twirl"),
    ("family", "family.html", "Family", "fam-jump-cat"),
    ("about", "about.html", "Meet Lydia", "lydia-cats"),
    ("kind-words", "kind-words.html", "Kind Words", "dance-circle"),
    ("faq", "faq.html", "FAQ", "ch-staircase"),
]

_dims = {}
def dims(name, size=1600):
    key = (name, size)
    if key not in _dims:
        with Image.open(os.path.join(IMG, f"{name}-{size}.webp")) as im:
            _dims[key] = im.size
    return _dims[key]

def img(name, alt="", extra=""):
    w, h = dims(name)
    eager = "eager" in extra.split()
    extra = " ".join(t for t in extra.split(" ") if t != "eager") if eager else extra
    sizes = "(max-width: 760px) 100vw, 60vw"
    m = re.search(r'sizes="([^"]+)"', extra)
    if m:
        sizes = m.group(1); extra = extra.replace(m.group(0), "")
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    # srcset widths must be each file's real pixel width (portrait "-800" files are 533 wide)
    w8 = dims(name, 800)[0]
    return (f'<img src="assets/img/{name}-1600.webp" '
            f'srcset="assets/img/{name}-800.webp {w8}w, assets/img/{name}-1600.webp {w}w" '
            f'sizes="{sizes}" width="{w}" height="{h}" alt="{html.escape(alt, quote=True)}" '
            f'{load} decoding="async" {extra.strip()}>').replace(" >", ">")

LOGO = '''<svg class="logo__mark" viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><circle cx="24" cy="24" r="7"/><g class="logo__rays">''' + "".join(
    f'<rect x="22.4" y="2" width="3.2" height="10" rx="1.6" transform="rotate({a} 24 24)"/>' for a in range(0, 360, 30)
) + '''</g></g></svg>'''

def header(active):
    menu_cur = lambda key: ' aria-current="page"' if key == active else ''
    links = "".join(
        f'<li><a href="{href}" class="hdr__link{" is-active" if key == active else ""}"'
        f'{" aria-current=\"page\"" if key == active else ""}>{label}</a></li>'
        for key, href, label, _ in NAV
    )
    menu_links = "".join(
        f'<li><a href="{href}" class="menu__link" data-preview="assets/img/{im}-800.webp"{menu_cur(key)}>'
        f'<span class="menu__num">0{i+1}</span><span class="menu__txt">{label}</span></a></li>'
        for i, (key, href, label, im) in enumerate(NAV)
    )
    return f'''
<a class="skip" href="#main">Skip to content</a>
<div class="transition" aria-hidden="true"><div class="transition__panel"><span>{LOGO}<span class="transition__name"></span></span></div></div>
<div class="cursor" aria-hidden="true"><span class="cursor__label"></span></div>
<header class="hdr" data-hdr>
  <div class="hdr__inner">
  <a class="logo" href="index.html" aria-label="Daniller Photography, home">{LOGO}<span class="logo__word">Daniller <em>Photography</em></span></a>
  <nav class="hdr__nav" aria-label="Primary"><ul>{links}</ul></nav>
  <div class="hdr__actions">
    <a class="btn btn--sm btn--poppy hdr__cta" href="contact.html" data-magnetic><span>Check your date</span><i class="btn__dot" aria-hidden="true"></i></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-btn><span class="menu-btn__lines" aria-hidden="true"><i></i><i></i></span><span class="menu-btn__txt">Menu</span></button>
  </div>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true" data-menu>
  <div class="menu__inner">
    <div class="menu__preview" aria-hidden="true"><img src="assets/img/ch-doors-burst-800.webp" alt="" width="533" height="800"></div>
    <nav class="menu__nav" aria-label="Menu"><ul>
      <li><a href="index.html" class="menu__link" data-preview="assets/img/hero-jump-800.webp"{menu_cur('home')}><span class="menu__num">00</span><span class="menu__txt">Home</span></a></li>
      {menu_links}
      <li><a href="contact.html" class="menu__link menu__link--cta" data-preview="assets/img/lips-mural-800.webp"{menu_cur('contact')}><span class="menu__num">07</span><span class="menu__txt">Let&rsquo;s do this</span></a></li>
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
      <a class="logo logo--light" href="index.html" aria-label="Daniller Photography, home">''' + LOGO + '''<span class="logo__word">Daniller <em>Photography</em></span></a>
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

def page(meta, body, slug):
    url = SITE_URL if slug == "index" else f"{SITE_URL}{slug}.html"
    strip = "".join(f'<figure>{img(n, "", "sizes=\"220px\"")}</figure>' for n in STRIP_IMGS * 2)
    title = meta["title"]
    lydia = img('lydia-cats', 'Lydia Daniller', 'sizes="120px"')
    return f'''<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">{meta.get('base', '')}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{meta['desc']}">
<meta name="theme-color" content="#F5F0E8">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Daniller Photography">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['desc']}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}assets/og/{slug}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/inter-tight.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/instrument-serif-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/style.css?v={VER}">
{HEAD_SCRIPT}
<script>window.DP_CONFIG={json.dumps(CONFIG)}</script>
{schema(meta, slug, body)}
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

BUSINESS = {
    "@context": "https://schema.org", "@type": "ProfessionalService", "@id": SITE_URL + "#business",
    "name": "Daniller Photography", "url": SITE_URL, "image": SITE_URL + "assets/og/index.jpg",
    "description": "Playful documentary photography for weddings, San Francisco City Hall ceremonies and families, by Lydia Daniller.",
    "email": "lydia@danillerphotography.com",
    "founder": {"@type": "Person", "name": "Lydia Daniller", "jobTitle": "Photographer"},
    "areaServed": ["San Francisco Bay Area", "Los Angeles"],
    "address": {"@type": "PostalAddress", "addressLocality": "San Francisco", "addressRegion": "CA", "addressCountry": "US"},
    "sameAs": ["https://www.instagram.com/danillerphotography/", "https://www.facebook.com/DanillerPhotography/"],
}
FAQ_RE = re.compile(r'<button class="faq__q"[^>]*>(.*?)<span class="faq__icon".*?<div class="faq__a"><div>(.*?)</div></div>', re.S)

def text(h):
    return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()

def schema(meta, slug, body):
    blocks = []
    if slug == "index":
        blocks.append(BUSINESS)
    faqs = FAQ_RE.findall(body)
    if faqs and slug in ("faq", "city-hall"):
        blocks.append({"@context": "https://schema.org", "@type": "FAQPage",
                       "mainEntity": [{"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}} for q, a in faqs]})
    if slug == "city-hall":
        blocks.append({"@context": "https://schema.org", "@type": "Service", "name": "San Francisco City Hall wedding photography",
                       "provider": {"@id": SITE_URL + "#business"}, "areaServed": "San Francisco, CA",
                       "offers": [{"@type": "Offer", "name": n, "price": pr, "priceCurrency": "USD"} for n, pr in
                                  [("Collection I, 1 hour", "1200"), ("Collection II, 1.5 hours", "1500"), ("Collection III, 2 hours", "2000")]]})
    return "\n".join(f'<script type="application/ld+json">{json.dumps(b, ensure_ascii=False)}</script>' for b in blocks)

META_RE = re.compile(r"<!--meta\n(.*?)\n-->\n?", re.S)
IMG_RE = re.compile(r"\{\{img ([a-z0-9-]+)\|([^|}]*)(?:\|([^}]*))?\}\}")

def build():
    urls = []
    for fn in sorted(os.listdir(PAGES)):
        if not fn.endswith(".html"):
            continue
        src = open(os.path.join(PAGES, fn), encoding="utf-8").read()
        m = META_RE.match(src)
        meta = dict(l.split(": ", 1) for l in m.group(1).splitlines() if ": " in l)
        body = src[m.end():]
        body = IMG_RE.sub(lambda mm: img(mm.group(1), mm.group(2), mm.group(3) or ""), body)
        body = body.replace("{{logo}}", LOGO)
        slug = fn[:-5]
        out = page(meta, body, slug)
        open(os.path.join(ROOT, fn), "w", encoding="utf-8").write(out)
        if "noindex" not in meta.get("head", "") and slug != "404":
            urls.append(SITE_URL if slug == "index" else f"{SITE_URL}{fn}")
        print("built", fn)
    open(os.path.join(ROOT, "sitemap.xml"), "w").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc></url>\n" for u in sorted(urls, key=lambda u: (u != SITE_URL, u))) + "</urlset>\n")
    open(os.path.join(ROOT, "robots.txt"), "w").write(
        f"User-agent: *\nDisallow: /notes-for-lydia.html\n\nSitemap: {SITE_URL}sitemap.xml\n")
    print("built sitemap.xml, robots.txt")

if __name__ == "__main__":
    build()

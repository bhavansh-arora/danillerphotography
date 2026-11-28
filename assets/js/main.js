/* Daniller Photography: interactions
   Smooth scroll (Lenis) + GSAP ScrollTrigger, with graceful fallbacks.

   Structure
   - One-time setup: smooth scroll, header, menu, cursor, lightbox UI, footer,
     notes mode and in-place page transitions.
   - initPage(root): wires up everything inside <main>. It runs on first load
     and again after every in-place page swap; destroyPage() undoes it. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const CFG = Object.assign({ email: 'lydia@danillerphotography.com', formEndpoint: '' }, window.DP_CONFIG || {});
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Sun times for San Francisco ----------------
     Standard sunrise equation; accurate to a minute or two. */
  const SF = { lat: 37.7793, lng: -122.4193, tz: 'America/Los_Angeles' };
  function sunset(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00Z');
    if (isNaN(d)) return null;
    const rad = Math.PI / 180;
    const J = d.getTime() / 86400000 + 2440587.5;
    const n = Math.round(J - 2451545.0);
    const Js = n - SF.lng / 360;
    const M = (357.5291 + 0.98560028 * Js) % 360;
    const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    const L = (M + C + 180 + 102.9372) % 360;
    const Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
    const cosw = (Math.sin(-0.833 * rad) - Math.sin(SF.lat * rad) * Math.sin(dec)) / (Math.cos(SF.lat * rad) * Math.cos(dec));
    const w = Math.acos(Math.max(-1, Math.min(1, cosw))) / rad;
    return new Date((Jt + w / 360 - 2440587.5) * 86400000);
  }
  const fmtClock = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: SF.tz });
  const minutesSF = d => { const p = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: SF.tz }).formatToParts(d); return +p.find(x => x.type === 'hour').value * 60 + +p.find(x => x.type === 'minute').value; };
  const fmtMin = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const fmtDate = (v, opts) => { if (!v) return ''; const d = new Date(v + 'T12:00:00'); return isNaN(d) ? v : d.toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); };
  const minDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const hdrOffset = () => -((parseFloat(getComputedStyle(html).getPropertyValue('--hdr-h')) || 80) + 8);
  const scrollTo = (target, offset = hdrOffset()) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
    else {
      const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + offset;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  };
  const jumpTop = () => { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); };

  /* ---------------- First-load gate (preloader / fallback entrance) ---------------- */
  let readyResolve;
  const firstReady = new Promise(r => (readyResolve = r));
  const entering = html.classList.contains('is-entering');
  store.del('dp-nav');
  function finishEnter() {
    if (!entering) return readyResolve();
    requestAnimationFrame(() => {
      html.classList.remove('is-entering');
      html.classList.add('is-entered');
      setTimeout(readyResolve, 250);
      setTimeout(() => html.classList.remove('is-entered'), 900);
    });
  }
  const pre = $('.preloader');
  if (pre && !html.classList.contains('no-pre') && hasGsap && !reduce) {
    store.set('dp-pre', '1');
    if (lenis) lenis.stop();
    const count = $('.preloader__count span', pre);
    const obj = { v: 0 };
    const letters = $$('.preloader__word span', pre);
    const rays = $$('.preloader__mark rect', pre);
    gsap.set(letters, { yPercent: 110 });
    gsap.set(rays, { scaleY: 0, transformOrigin: '24px 24px' });
    gsap.timeline()
      .to(rays, { scaleY: 1, duration: .5, ease: 'back.out(2)', stagger: .04 }, 0)
      .to($('.preloader__mark', pre), { rotate: 90, duration: 1.8, ease: 'power2.inOut' }, 0)
      .to(letters, { yPercent: 0, duration: .9, ease: 'expo.out', stagger: 0.04 }, 0.15)
      .to(obj, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, '0'); } }, 0)
      .to($('.preloader__bar', pre), { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to([letters, $('.preloader__mark', pre)], { yPercent: -120, opacity: 0, duration: .6, ease: 'expo.in', stagger: 0.015 }, 1.7)
      .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' }, 1.95)
      .add(() => { if (lenis) lenis.start(); readyResolve(); }, 2.2)
      .add(() => pre.remove());
    if (entering) html.classList.remove('is-entering');
  } else {
    if (pre) pre.remove();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(finishEnter); else finishEnter();
    setTimeout(finishEnter, 1200);
  }

  /* ---------------- Header ---------------- */
  const hdr = $('[data-hdr]');
  const mcta = $('[data-mobile-cta]');
  const footer = $('.ftr');
  let lastY = 0, footerVisible = false;
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { footerVisible = en.isIntersecting; onScroll(); }, { threshold: 0 }).observe(footer);
  }
  function onScroll() {
    const y = window.scrollY;
    if (hdr) {
      hdr.classList.toggle('is-solid', y > 40);
      if (!html.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > 320 && y > lastY + 2);
      if (y < lastY - 2) hdr.classList.remove('is-hidden');
    }
    if (mcta) mcta.classList.toggle('is-on', !body.classList.contains('page-contact') && y > innerHeight * .7 && !footerVisible);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Menu ---------------- */
  const menu = $('[data-menu]');
  const menuBtn = $('[data-menu-btn]');
  let menuOpener = null;
  function openMenu(viaKeyboard) {
    html.classList.add('menu-open');
    menu.setAttribute('aria-hidden', 'false');
    menu.removeAttribute('inert');
    menuBtn.setAttribute('aria-expanded', 'true');
    $('.menu-btn__txt', menuBtn).textContent = 'Close';
    if (lenis) lenis.stop();
    hdr && hdr.classList.remove('is-hidden');
    if (viaKeyboard) { menuOpener = menuBtn; setTimeout(() => { const f = $('.menu__link', menu); f && f.focus(); }, 300); }
  }
  function closeMenu() {
    if (!menu || !html.classList.contains('menu-open')) return;
    html.classList.remove('menu-open');
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
    menuBtn.setAttribute('aria-expanded', 'false');
    $('.menu-btn__txt', menuBtn).textContent = 'Menu';
    if (lenis) lenis.start();
    if (menuOpener) { menuOpener.focus(); menuOpener = null; }
  }
  if (menu) menu.setAttribute('inert', '');
  if (menuBtn) menuBtn.addEventListener('click', e => html.classList.contains('menu-open') ? closeMenu() : openMenu(e.detail === 0));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeNote(); } });
  const preview = $('.menu__preview img');
  $$('.menu__link').forEach(l => l.addEventListener('mouseenter', () => {
    const src = l.dataset.preview;
    if (!preview || !src || preview.getAttribute('src') === src) return;
    preview.style.opacity = 0;
    setTimeout(() => { preview.src = src; preview.onload = () => (preview.style.opacity = 1); }, 180);
  }));

  /* ---------------- Cursor + global magnetic ---------------- */
  const cursor = $('.cursor'), cursorLabel = $('.cursor__label');
  const resetCursor = () => { if (cursor) cursor.classList.remove('is-big', 'is-link'); };
  const magnetic = el => {
    if (!fine || reduce || el.dataset.magBound) return;
    el.dataset.magBound = '1';
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    el.addEventListener('mouseleave', () => (el.style.transform = ''));
  };
  if (fine && !reduce && cursor) {
    html.classList.add('has-cursor');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    cursor.style.opacity = 0;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; if (cursor.style.opacity === '0') { cx = x; cy = y; cursor.style.opacity = 1; } }, { passive: true });
    const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t) { cursorLabel.textContent = t.dataset.cursor; cursor.classList.add('is-big'); cursor.classList.remove('is-link'); return; }
      cursor.classList.remove('is-big');
      cursor.classList.toggle('is-link', !!e.target.closest('a, button, label, select, input[type="date"], input[type="range"]'));
    });
    document.addEventListener('mouseleave', () => (cursor.style.opacity = 0));
    document.addEventListener('mouseenter', () => (cursor.style.opacity = 1));
  }
  $$('[data-magnetic]').forEach(el => { if (!el.closest('main')) magnetic(el); });

  /* ---------------- Lightbox (UI lives outside <main>) ---------------- */
  const lb = $('[data-lightbox-ui]');
  let lbOpen = () => {}, lbClose = () => {};
  if (lb) {
    const lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb), lbCount = $('[data-lb-count]', lb);
    let list = [], idx = 0, lastFocus;
    const render = () => {
      const im = list[idx];
      lbImg.src = im.currentSrc || im.getAttribute('src'); lbImg.alt = im.alt;
      const hi = im.getAttribute('src');
      if (hi && hi !== lbImg.src) { const pre = new Image(); pre.onload = () => { if (list[idx] === im) lbImg.src = hi; }; pre.src = hi; }
      lbCap.textContent = im.closest('figure')?.dataset.cap || im.alt || '';
      lbCount.textContent = (idx + 1) + ' / ' + list.length;
    };
    lbOpen = (gal, im) => {
      list = $$('figure:not(.is-hidden):not(.is-more) img', gal); idx = Math.max(0, list.indexOf(im));
      if (!list.length) return;
      render(); lastFocus = document.activeElement;
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); if (lenis) lenis.stop();
      $('[data-lb-close]', lb).focus();
    };
    lbClose = () => {
      if (!lb.classList.contains('is-open')) return;
      lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); if (lenis) lenis.start(); lastFocus && lastFocus.focus && lastFocus.focus();
    };
    const step = d => { idx = (idx + d + list.length) % list.length; render(); };
    $('[data-lb-close]', lb).addEventListener('click', lbClose);
    $('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => step(1));
    lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
    });
    let sx = 0;
    lb.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
    lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  }

  /* ---------------- Footer: wordmark + newsletter ---------------- */
  const word = $('.ftr__word');
  if (word) {
    const txt = word.textContent.trim();
    word.innerHTML = txt.split('').map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
    if ('IntersectionObserver' in window && !reduce) {
      // Re-arms every time: plays when the footer arrives, resets when it leaves.
      new IntersectionObserver(([en]) => word.classList.toggle('in', en.isIntersecting), { threshold: .25 }).observe(word);
    } else word.classList.add('in');
    if (fine && !reduce) {
      const spans = $$('span', word);
      word.addEventListener('mousemove', e => spans.forEach(s => {
        const r = s.getBoundingClientRect(); const d = Math.abs(e.clientX - (r.left + r.width / 2));
        s.style.setProperty('--lift', Math.max(0, 1 - d / 260).toFixed(3));
      }));
      word.addEventListener('mouseleave', () => spans.forEach(s => s.style.setProperty('--lift', 0)));
    }
  }
  $$('[data-news]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const i = $('input', f), m = $('.news__msg', f);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value)) { m.textContent = 'Please enter a valid email.'; return; }
    m.textContent = 'Thank you! You’re on the list.'; i.value = '';
  }));
  $$('[data-year]').forEach(y => (y.textContent = new Date().getFullYear()));
  $$('[data-to-top]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollTo(0, 0); }));

  /* ---------------- Notes mode (?notes=1) ----------------
     Pins on the live site explain each upgrade, for the pitch walkthrough. */
  const qs = new URLSearchParams(location.search);
  if (qs.get('notes') === '1') store.set('dp-notes', '1');
  if (qs.get('notes') === '0') store.del('dp-notes');
  let notesOn = store.get('dp-notes') === '1';
  let npop = null;
  function closeNote() { if (npop) npop.classList.remove('is-on'); $$('.npin.is-on').forEach(p => p.classList.remove('is-on')); }
  function notesBar() {
    let bar = $('.nbar');
    if (!notesOn) { if (bar) bar.remove(); return; }
    if (bar) return;
    bar = document.createElement('div'); bar.className = 'nbar';
    bar.innerHTML = '<span class="nbar__dot"></span><span>Notes mode<em> · tap a numbered pin</em></span><a href="notes-for-lydia.html">All notes</a><button type="button" aria-label="Turn notes off">Hide</button>';
    $('button', bar).addEventListener('click', () => { notesOn = false; store.del('dp-notes'); $$('.npin').forEach(p => p.remove()); closeNote(); bar.remove(); });
    body.appendChild(bar);
  }
  function notesInit(root) {
    notesBar();
    if (!notesOn) return;
    if (!npop) { npop = document.createElement('div'); npop.className = 'npop'; npop.setAttribute('role', 'dialog'); body.appendChild(npop); }
    $$('[data-note]', root).forEach((el, i) => {
      if ($(':scope > .npin', el)) return;
      if (getComputedStyle(el).position === 'static') el.classList.add('has-npin');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'npin'; b.textContent = i + 1;
      b.setAttribute('aria-label', 'What changed here');
      b.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const was = b.classList.contains('is-on'); closeNote(); if (was) return;
        const [what, why] = el.dataset.note.split('||');
        npop.innerHTML = `<b>${what}</b>${why ? `<p>${why}</p>` : ''}`;
        const r = b.getBoundingClientRect();
        npop.style.left = Math.max(12, Math.min(innerWidth - 332, r.left - 8)) + 'px';
        npop.style.top = (r.bottom + 10 + 220 > innerHeight ? r.top - 10 - 200 : r.bottom + 10) + 'px';
        npop.classList.add('is-on'); b.classList.add('is-on'); noteY = scrollY;
      });
      el.appendChild(b);
    });
  }
  document.addEventListener('click', e => { if (npop && !e.target.closest('.npop,.npin')) closeNote(); });
  let noteY = 0;
  window.addEventListener('scroll', () => { if (npop && npop.classList.contains('is-on') && Math.abs(scrollY - noteY) > 120) closeNote(); }, { passive: true });

  /* ==========================================================================
     IN-PLACE PAGE TRANSITIONS
     The panel covers the screen, the next page's <main> is fetched and swapped
     in underneath, the address bar and history update, then the panel lifts.
     No new document is loaded, so iPhone browsers never resize mid-change.
     ========================================================================== */
  const trName = $('.transition__name');
  const LABELS = { '': 'Home', index: 'Home', 'city-hall': 'City Hall', weddings: 'Weddings', family: 'Family', about: 'Meet Lydia', 'kind-words': 'Kind Words', faq: 'FAQ', contact: 'Check your date', 'notes-for-lydia': 'Notes for Lydia', '404': 'Lost?' };
  const keyOf = path => (path.split('/').pop() || '').replace(/\.html$/, '');
  const pageCache = {};
  const fetchPage = path => {
    if (!pageCache[path]) {
      pageCache[path] = fetch(path, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .catch(err => { delete pageCache[path]; throw err; });
    }
    return pageCache[path];
  };
  const isPageUrl = url => url.origin === location.origin && (/\.html$/.test(url.pathname) || /\/$/.test(url.pathname));
  const hardGo = url => { store.set('dp-nav', '1'); location.href = url.href; };
  let navigating = false;
  let shownKey = location.pathname + location.search;

  function cover(label) {
    if (trName) trName.textContent = label;
    html.classList.remove('is-entered');
    html.classList.add('is-leaving');
    return wait(760);
  }
  function lift() {
    html.classList.add('is-entered');
    html.classList.remove('is-leaving');
    setTimeout(() => { html.classList.remove('is-entered'); navigating = false; onScroll(); }, 950);
  }
  function navigate(url, push) {
    if (navigating) return;
    if (reduce || !window.fetch || !window.DOMParser || !history.pushState) { location.href = url.href; return; }
    navigating = true;
    closeMenu(); closeNote(); lbClose();
    if (lenis) lenis.stop();
    Promise.all([fetchPage(url.pathname), cover(LABELS[keyOf(url.pathname)] || 'Daniller')])
      .then(([text]) => swap(text, url, push))
      .catch(() => hardGo(url));
  }
  function swap(text, url, push) {
    const next = new DOMParser().parseFromString(text, 'text/html');
    const nm = next.querySelector('main');
    const verNow = $('script[src*="assets/js/main.js"]')?.getAttribute('src');
    const verNext = next.querySelector('script[src*="assets/js/main.js"]')?.getAttribute('src');
    if (!nm || (verNow && verNext && verNow !== verNext)) { hardGo(url); return; }
    destroyPage();
    $$('.preloader', nm).forEach(p => p.remove());
    $('main').replaceWith(document.importNode(nm, true));
    document.title = next.title;
    ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[property="og:image"]', 'link[rel="canonical"]'].forEach(sel => {
      const a = $(sel), b = next.querySelector(sel);
      if (a && b) ['content', 'href'].forEach(k => b.hasAttribute(k) && a.setAttribute(k, b.getAttribute(k)));
    });
    const rA = $('meta[name="robots"]'), rB = next.querySelector('meta[name="robots"]');
    if (rA && !rB) rA.remove(); else if (!rA && rB) document.head.appendChild(document.importNode(rB, true));
    body.className = next.body.className;
    [['.hdr__nav', '.hdr__nav'], ['.menu__nav', '.menu__nav']].forEach(([a, b]) => { const A = $(a), B = next.querySelector(b); if (A && B) A.innerHTML = B.innerHTML; });
    if (push) history.pushState({ dp: 1 }, '', url.href);
    shownKey = url.pathname + url.search;
    jumpTop();
    resetCursor();
    if (hdr) hdr.classList.remove('is-hidden');
    lastY = 0;
    if (lenis) lenis.start();
    initPage($('main'), wait(220));
    if (hasGsap) ScrollTrigger.refresh();
    if (url.hash) {
      const t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (t) setTimeout(() => scrollTo(t), 650);
    }
    lift();
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (href.charAt(0) === '#') {
      if (href.length < 2) return;
      const t = document.getElementById(href.slice(1));
      if (t) { e.preventDefault(); closeMenu(); scrollTo(t); }
      return;
    }
    const url = new URL(a.href, location.href);
    if (!isPageUrl(url)) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      e.preventDefault(); closeMenu();
      const t = url.hash && document.getElementById(url.hash.slice(1));
      scrollTo(t || 0, t ? hdrOffset() : 0);
      return;
    }
    e.preventDefault();
    navigate(url, true);
  });
  // GET forms that lead to another page (date checks) travel the same way
  document.addEventListener('submit', e => {
    const f = e.target;
    if (e.defaultPrevented || (f.getAttribute('method') || 'get').toLowerCase() !== 'get' || !f.getAttribute('action')) return;
    const url = new URL(f.getAttribute('action'), location.href);
    if (!isPageUrl(url)) return;
    e.preventDefault();
    const p = new URLSearchParams();
    new FormData(f).forEach((v, k) => { if (v) p.append(k, v); });
    url.search = p.toString();
    navigate(url, true);
  });
  if (history.replaceState) {
    history.replaceState({ dp: 1 }, '', location.href);
    window.addEventListener('popstate', () => {
      const url = new URL(location.href);
      if (url.pathname + url.search === shownKey) return; // hash-only change
      if (!isPageUrl(url)) return;
      navigate(url, false);
    });
  }
  window.addEventListener('pageshow', e => { if (e.persisted) { html.classList.remove('is-leaving', 'is-entering', 'is-entered'); navigating = false; closeMenu(); } });
  // Warm pages up as soon as a finger or cursor reaches a link
  const warm = e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:)/i.test(href) || a.target === '_blank') return;
    const u = new URL(a.href, location.href);
    if (isPageUrl(u) && u.pathname !== location.pathname) fetchPage(u.pathname).catch(() => {});
  };
  document.addEventListener('touchstart', warm, { passive: true });
  document.addEventListener('mouseover', warm, { passive: true });
  // On idle, warm only the main booking journey (never on data-saver)
  if (!(navigator.connection && navigator.connection.saveData)) (window.requestIdleCallback || (f => setTimeout(f, 2000)))(() => {
    ['city-hall.html', 'contact.html'].forEach(h => { const u = new URL(h, location.href); if (u.pathname !== location.pathname) fetchPage(u.pathname).catch(() => {}); });
  });

  /* ==========================================================================
     PER-PAGE
     ========================================================================== */
  let ctx = null, mm = null, cleanups = [];
  const onCleanup = f => cleanups.push(f);
  const every = (f, ms) => { const id = setInterval(f, ms); onCleanup(() => clearInterval(id)); return id; };
  const later = (f, ms) => { const id = setTimeout(f, ms); onCleanup(() => clearTimeout(id)); return id; };
  const listen = (t, ev, f, o) => { t.addEventListener(ev, f, o); onCleanup(() => t.removeEventListener(ev, f, o)); };

  function destroyPage() {
    cleanups.forEach(f => { try { f(); } catch (e) {} });
    cleanups = [];
    if (mm) { mm.revert(); mm = null; }
    if (ctx) { ctx.revert(); ctx = null; }
    $$('.hover-img').forEach(e => e.remove());
  }

  function splitWords(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
            wi.textContent = p; w.appendChild(wi); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          if (child.hasAttribute('data-nosplit')) {
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
            child.replaceWith(w); wi.appendChild(child); w.appendChild(wi);
          } else walk(child);
        }
      });
    };
    walk(el);
  }

  function initPage(root, readyP) {
    $$('[data-magnetic]', root).forEach(magnetic);
    $$('[data-split]', root).forEach(splitWords);
    $$('input[type="date"]', root).forEach(d => (d.min = minDate));

    /* Reveal on view: fires just before elements enter the viewport */
    const targets = $$('[data-reveal],[data-split],[data-media],.shead[data-line],.squiggle,[data-inview],.phero__media', root);
    if (!('IntersectionObserver' in window) || reduce) targets.forEach(t => t.classList.add('in'));
    else readyP.then(() => {
      if (!root.isConnected) return;
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }), { rootMargin: '0px 0px 6% 0px', threshold: 0 });
      targets.forEach(t => io.observe(t));
      onCleanup(() => io.disconnect());
    });

    ctx = hasGsap ? gsap.context(() => {}) : null;
    const G = f => (ctx ? ctx.add(f) : null);

    /* Scrubbed text */
    $$('[data-scrub]', root).forEach(el => {
      const walk = node => Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(' '));
            else { const s = document.createElement('span'); s.className = 'sw'; s.textContent = p; frag.appendChild(s); }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
      walk(el);
      const words = $$('.sw', el);
      if (!hasGsap || reduce) { words.forEach(w => w.classList.add('on')); return; }
      G(() => ScrollTrigger.create({
        trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: true,
        onUpdate: self => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); }
      }));
    });

    /* Counters */
    $$('[data-count]', root).forEach(el => {
      const end = parseFloat(el.dataset.count); const dec = (el.dataset.count.split('.')[1] || '').length;
      if (!hasGsap || reduce) { el.textContent = end.toFixed(dec); return; }
      el.textContent = (0).toFixed(dec);
      const o = { v: 0 };
      G(() => ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'expo.out', onUpdate: () => (el.textContent = o.v.toFixed(dec)) }) }));
    });

    /* GSAP scroll effects */
    if (hasGsap && !reduce) {
      G(() => {
        $$('[data-parallax]', root).forEach(el => {
          const amt = parseFloat(el.dataset.parallax) || 10;
          const t = el.tagName === 'IMG' ? el : $('img', el) || el;
          gsap.fromTo(t, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        $$('.wall__row', root).forEach(row => {
          const dir = parseFloat(row.dataset.dir || 1);
          gsap.fromTo(row, { xPercent: dir > 0 ? -18 : -2 }, { xPercent: dir > 0 ? -2 : -18, ease: 'none', scrollTrigger: { trigger: row.closest('.wall'), start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        const hero = $('.hero', root);
        if (hero) {
          gsap.to($('.hero__content', hero), { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
          gsap.to($('.hero__bg', hero), { scale: .94, borderRadius: 40, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        }
        const ph = $('.phero__media img', root);
        if (ph) gsap.fromTo(ph, { yPercent: -8 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: ph.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        $$('.timeline', root).forEach(tl => {
          const line = $('.timeline__line', tl);
          if (line) gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 80%', end: 'bottom 55%', scrub: true } });
        });
        $$('.cta-big__float', root).forEach((f, i) => {
          gsap.fromTo(f, { y: 80 + i * 20, rotate: (i % 2 ? 8 : -8) }, { y: -60 - i * 20, rotate: (i % 2 ? -4 : 4), ease: 'none', scrollTrigger: { trigger: f.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
      mm = gsap.matchMedia();
      mm.add('(min-width: 901px)', () => {
        const stackCards = $$('.stack-card', root);
        stackCards.forEach((c, i) => {
          if (i === stackCards.length - 1) return;
          gsap.to(c, { scale: .95, filter: 'brightness(.94)', ease: 'none', scrollTrigger: { trigger: stackCards[i + 1], start: 'top 85%', end: 'top 30%', scrub: true } });
        });
        $$('[data-hrail]', root).forEach(sec => {
          const track = $('.hrail__track', sec);
          const bar = $('.progress i', sec);
          const dist = () => Math.max(0, track.scrollWidth - innerWidth);
          const tw = gsap.to(track, { x: () => -dist(), ease: 'none' });
          ScrollTrigger.create({
            trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, animation: tw, invalidateOnRefresh: true,
            onUpdate: s => bar && gsap.set(bar, { scaleX: s.progress })
          });
        });
      });
    } else $$('[data-hrail] .progress', root).forEach(p => (p.style.display = 'none'));
    $$('[data-hrail]', root).forEach(sec => {
      const track = $('.hrail__track', sec), bar = $('.progress i', sec);
      if (!track || !bar) return;
      track.addEventListener('scroll', () => {
        if (innerWidth > 900 && !reduce) return;
        const p = track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth);
        bar.style.transform = `scaleX(${p})`;
      }, { passive: true });
    });

    /* Hero slideshow + word rotator */
    const slides = $$('.hero__slide', root);
    const dots = $$('.hero__dots button', root);
    if (slides.length > 1) {
      let cur = 0, timer;
      const go = n => {
        slides[cur].classList.remove('is-on'); dots[cur] && dots[cur].classList.remove('is-on');
        cur = (n + slides.length) % slides.length;
        slides[cur].classList.add('is-on');
        if (dots[cur]) { void dots[cur].offsetWidth; dots[cur].classList.add('is-on'); }
        const hc = $('[data-hero-count]', root); if (hc) hc.textContent = String(cur + 1).padStart(2, '0');
        clearTimeout(timer); timer = setTimeout(() => go(cur + 1), 5500);
      };
      onCleanup(() => clearTimeout(timer));
      dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
      readyP.then(() => root.isConnected && go(0));
    }
    $$('[data-rotator]', root).forEach(r => {
      const words = $$('span', r);
      if (words.length < 2 || reduce) return;
      let i = 0;
      every(() => {
        words.forEach(w => w.classList.remove('was-on'));
        words[i].classList.remove('is-on'); words[i].classList.add('was-on');
        i = (i + 1) % words.length;
        words[i].classList.add('is-on');
      }, 2300);
    });

    /* Expanding panels */
    $$('[data-panels]', root).forEach(wrap => {
      const ps = $$('.panel', wrap);
      const open = p => ps.forEach(x => x.classList.toggle('is-open', x === p));
      ps.forEach(p => {
        if (fine) p.addEventListener('mouseenter', () => open(p));
        p.addEventListener('focusin', () => open(p));
      });
    });

    /* Hover image list */
    $$('[data-hlist]', root).forEach(list => {
      if (!fine) return;
      const box = document.createElement('div'); box.className = 'hover-img';
      const im = document.createElement('img'); im.alt = ''; box.appendChild(im); body.appendChild(box);
      let x = 0, y = 0, cx = 0, cy = 0, raf = null;
      const loop = () => { cx += (x - cx) * .14; cy += (y - cy) * .14; box.style.left = cx + 'px'; box.style.top = cy + 'px'; raf = requestAnimationFrame(loop); };
      onCleanup(() => cancelAnimationFrame(raf));
      list.addEventListener('mousemove', e => { x = e.clientX + 140; y = e.clientY; });
      $$('[data-img]', list).forEach(row => row.addEventListener('mouseenter', e => {
        im.src = row.dataset.img; if (!raf) { cx = x = e.clientX + 140; cy = y = e.clientY; loop(); } box.classList.add('is-on');
      }));
      list.addEventListener('mouseleave', () => { box.classList.remove('is-on'); cancelAnimationFrame(raf); raf = null; });
    });

    /* Quotes slider */
    $$('[data-quotes]', root).forEach(q => {
      const items = $$('.quote', q), imgs = $$('.quotes__media img', q), count = $('.quotes__count', q);
      let i = 0, timer;
      onCleanup(() => clearTimeout(timer));
      const show = n => {
        i = (n + items.length) % items.length;
        items.forEach((it, k) => { it.classList.toggle('is-on', k === i); it.setAttribute('aria-hidden', k !== i); });
        imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
        if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
        clearTimeout(timer); timer = setTimeout(() => show(i + 1), 8000);
      };
      $('[data-prev]', q)?.addEventListener('click', () => show(i - 1));
      $('[data-next]', q)?.addEventListener('click', () => show(i + 1));
      q.addEventListener('mouseenter', () => clearTimeout(timer));
      q.addEventListener('mouseleave', () => { clearTimeout(timer); timer = setTimeout(() => show(i + 1), 5000); });
      let sx = 0;
      q.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
      q.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); });
      show(0);
    });

    /* Galleries: "show all", filters, lightbox */
    $$('[data-gallery]', root).forEach(gal => {
      const limit = parseInt(gal.dataset.limit || '0', 10);
      const figs = $$('figure', gal);
      if (limit && figs.length > limit) {
        figs.slice(limit).forEach(f => f.classList.add('is-more'));
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn btn--ghost gal-more';
        btn.innerHTML = `<span>Show all ${figs.length} photos</span>`;
        btn.addEventListener('click', () => {
          figs.forEach(f => f.classList.remove('is-more')); btn.remove();
          if (hasGsap) ScrollTrigger.refresh();
        });
        const wrap = document.createElement('div'); wrap.className = 'gal-more-wrap'; wrap.appendChild(btn);
        gal.after(wrap);
        gal._expand = () => btn.isConnected && btn.click();
      }
      figs.forEach(fig => {
        fig.setAttribute('tabindex', '0'); fig.setAttribute('role', 'button');
        fig.setAttribute('aria-label', 'Open image: ' + ($('img', fig)?.alt || 'photo'));
        fig.addEventListener('click', () => lbOpen(gal, $('img', fig)));
        fig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(gal, $('img', fig)); } });
      });
    });
    $$('[data-filters]', root).forEach(f => {
      const gal = document.getElementById(f.dataset.filters);
      if (!gal) return;
      const figs = $$('figure', gal);
      const has = (x, tag) => (x.dataset.tags || '').split(' ').includes(tag);
      $$('.filter', f).forEach(b => {
        const tag = b.dataset.filter;
        const n = tag === 'all' ? figs.length : figs.filter(x => has(x, tag)).length;
        const sup = document.createElement('sup'); sup.textContent = n; b.appendChild(sup);
        b.addEventListener('click', () => {
          if (gal._expand && tag !== 'all') gal._expand();
          $$('.filter', f).forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
          figs.forEach(fig => fig.classList.toggle('is-hidden', tag !== 'all' && !has(fig, tag)));
          if (hasGsap) { ScrollTrigger.refresh(); if (!reduce) gsap.fromTo(figs.filter(x => !x.classList.contains('is-hidden') && !x.classList.contains('is-more')), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, stagger: .025, ease: 'expo.out' }); }
        });
      });
    });

    /* City Hall collection builder */
    const builder = $('[data-builder]', root);
    if (builder) {
      const data = [
        { id: 'I', hours: 1, label: '1 hour', images: 100, price: 1200, title: 'Quick &amp; easy', desc: 'I document your ceremony, plus portraits of you and your guests. Perfect when it&rsquo;s just the two of you and a few favourite people.', best: ['Ceremony, start to finish', 'Portraits of the two of you', 'Group photos with your guests'], img: 0 },
        { id: 'II', hours: 1.5, label: '1.5 hours', images: 150, price: 1500, title: 'More time for portraits', desc: 'Designed for couples who want more time for portraits. I&rsquo;ll guide you through the building and take you to all the best locations.', best: ['Everything in Collection I', 'Grand Staircase &amp; Rotunda portraits', 'Unhurried time on the upper floors'], img: 1 },
        { id: 'III', hours: 2, label: '2 hours', images: 200, price: 2000, title: 'The full City Hall story', desc: 'For an extensive portrait session, and for celebrations with more guests in attendance. Room to breathe, play and wander.', best: ['Everything in Collection II', 'Extended family groupings', 'Candids of every guest'], img: 2 },
        { id: 'IV', hours: 3, label: '3+ hours', images: 300, price: null, title: 'City Hall &amp; beyond', desc: 'Add multiple locations around the city after your ceremony: Golden Gate views, a cable car, your favourite bar for a toast.', best: ['Everything in Collection III', 'Multiple locations across San Francisco', 'Celebration coverage after the ceremony'], img: 3 }
      ];
      const tabs = $$('.builder__tab', builder), pill = $('.builder__pill', builder);
      const elImgs = $('[data-b-images]', builder), elPrice = $('[data-b-price]', builder), elDesc = $('[data-b-desc]', builder);
      const elTitle = $('[data-b-title]', builder), elList = $('[data-b-list]', builder), elCta = $('[data-b-cta]', builder);
      const bars = { hours: $('[data-bar="hours"]', builder), images: $('[data-bar="images"]', builder) };
      const vals = { hours: $('[data-val="hours"]', builder), images: $('[data-val="images"]', builder) };
      const mediaImgs = $$('.builder__media img', builder);
      const current = { images: 150 };
      const fmt = n => '$' + n.toLocaleString('en-US');
      const set = i => {
        const d = data[i];
        tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
        if (pill) pill.style.transform = `translateX(calc(${i * 100}% + ${i * 8}px))`;
        if (hasGsap && !reduce) G(() => gsap.to(current, { images: d.images, duration: .9, ease: 'expo.out', onUpdate: () => (elImgs.textContent = Math.round(current.images)) }));
        else elImgs.textContent = d.images;
        current.images = d.images;
        elPrice.innerHTML = d.price ? fmt(d.price) : 'Custom quote';
        elDesc.innerHTML = d.desc; elTitle.innerHTML = 'Collection ' + d.id + ' &middot; ' + d.title;
        elList.innerHTML = d.best.concat(['High-res edited images + download link', 'Private online gallery with printing']).map(x => `<li>${x}</li>`).join('');
        bars.hours.style.transform = `scaleX(${d.hours / 3})`; vals.hours.textContent = d.label;
        bars.images.style.transform = `scaleX(${d.images / 300})`; vals.images.textContent = d.images + '+';
        mediaImgs.forEach((m, k) => m.classList.toggle('is-on', k === d.img));
        elCta.href = `contact.html?type=cityhall&collection=${d.id}`;
        builder.dispatchEvent(new CustomEvent('collection', { detail: d.id, bubbles: true }));
      };
      tabs.forEach((t, i) => t.addEventListener('click', () => set(i)));
      builder.addEventListener('keydown', e => {
        const i = tabs.findIndex(t => t.classList.contains('is-on'));
        if (e.key === 'ArrowRight') { set((i + 1) % 4); tabs[(i + 1) % 4].focus(); }
        if (e.key === 'ArrowLeft') { set((i + 3) % 4); tabs[(i + 3) % 4].focus(); }
      });
      set(1);
    }

    /* City Hall map + spots */
    $$('[data-spots]', root).forEach(w => {
      const btns = $$('.spots__btn', w), panels = $$('.spots__panel', w), pins = $$('.cmap__pin', w);
      const set = i => {
        btns.forEach((b, k) => b.setAttribute('aria-selected', k === i));
        pins.forEach((p, k) => { p.classList.toggle('is-on', k === i); p.setAttribute('aria-pressed', k === i); });
        panels.forEach((p, k) => p.classList.toggle('is-on', k === i));
      };
      [btns, pins].forEach(group => group.forEach((b, i) => {
        b.addEventListener('click', () => {
          set(i);
          if (group === pins && innerWidth <= 1024) { const pw = $('.spots__panel-wrap', w); if (pw && pw.getBoundingClientRect().top > innerHeight * .55) scrollTo(pw); }
        });
        if (fine) b.addEventListener('mouseenter', () => set(i));
      }));
      set(0);
    });

    /* City Hall day planner */
    const planner = $('[data-planner]', root);
    if (planner) {
      const DUR = { I: 60, II: 90, III: 120, IV: 180 };
      const elDate = $('[name="pl-date"]', planner), elTime = $('[name="pl-time"]', planner);
      const out = k => $(`[data-pl="${k}"]`, planner);
      const steps = $$('[data-pl-step]', planner);
      const last = $('[data-pl-last]', planner);
      const coll = () => ($('[name="pl-coll"]:checked', planner) || {}).value || 'II';
      const update = () => {
        const T = (() => { const [h, m] = (elTime.value || '14:00').split(':').map(Number); return h * 60 + m; })();
        const c = coll(), dur = DUR[c], start = T - 30, end = start + dur;
        const offs = { hello: -30, checkin: -15, ceremony: 0, portraits: 15, end: dur - 30 };
        steps.forEach(s => { const k = s.dataset.plStep; if (k === 'before') return; $('.tstep__time', s).textContent = fmtMin(T + offs[k]); });
        if (last) {
          $('h3', last).textContent = c === 'IV' ? 'Onward across the city' : 'Pop the bubbly';
          $('p', last).textContent = c === 'IV' ? 'A second location after the ceremony: Golden Gate views, a cable car, your favourite bar for a toast.' : 'Out the front doors in style. Your gallery lands in 2–3 weeks.';
        }
        out('span').textContent = `${fmtMin(start)} – ${fmtMin(end)}${c === 'IV' ? '+' : ''}`;
        out('coll').textContent = `Collection ${c} · ${c === 'IV' ? '3+ hours' : (dur / 60) + (dur === 60 ? ' hour' : ' hours')}`;
        const ss = sunset(elDate.value);
        let tip, msg = `From the City Hall day planner: ceremony at ${fmtMin(T)}, Collection ${c} (${fmtMin(start)} to ${fmtMin(end)}${c === 'IV' ? '+' : ''})`;
        if (ss) {
          const sMin = minutesSF(ss), golden = sMin - 60;
          out('sun').textContent = fmtClock(ss);
          out('golden').textContent = fmtMin(golden);
          out('date').textContent = fmtDate(elDate.value, { weekday: 'long', month: 'long', day: 'numeric' });
          if (end >= golden && start < sMin) tip = 'Your portraits overlap golden hour that day. Lucky light.';
          else if (c === 'IV') tip = `Golden hour starts around ${fmtMin(golden)}. Worth timing your second location around it.`;
          else if (sMin - end < 150) tip = `Sunset is only ${Math.round((sMin - end) / 6) / 10} hours after you finish. Collection IV could carry you into golden hour.`;
          else tip = 'A bright daytime ceremony: the building&rsquo;s tall windows do the heavy lifting.';
          msg += `. Sunset that day: ${fmtClock(ss)}.`;
        } else {
          out('sun').textContent = '—'; out('golden').textContent = '—'; out('date').textContent = 'Pick a date';
          tip = 'Pick a date to see sunset and golden hour for that day in San Francisco.';
          msg += '.';
        }
        out('tip').innerHTML = tip;
        const p = new URLSearchParams({ type: 'cityhall', collection: c, time: elTime.value || '' });
        if (elDate.value) p.set('date', elDate.value);
        p.set('msg', msg); p.set('src', 'City Hall day planner');
        out('cta').href = 'contact.html?' + p.toString();
      };
      planner.addEventListener('input', update); planner.addEventListener('change', update);
      listen(root, 'collection', e => { const r = $(`[name="pl-coll"][value="${e.detail}"]`, planner); if (r && !planner.dataset.touched) { r.checked = true; update(); } });
      planner.addEventListener('pointerdown', () => (planner.dataset.touched = '1'), { once: true });
      update();
    }

    /* Weddings coverage sizer */
    const cov = $('[data-coverage]', root);
    if (cov) {
      const range = $('input[type="range"]', cov), dotsBox = $('[data-cov-dots]', cov);
      const PER = 75, DOT = 25, MAX = 10;
      dotsBox.innerHTML = Array.from({ length: MAX * PER / DOT }, () => '<i></i>').join('');
      const dotEls = $$('i', dotsBox);
      const n = { v: 0 };
      const upd = () => {
        const h = +range.value, imgs = h * PER;
        $('[data-cov="hours"]', cov).textContent = h;
        $('[data-cov="unit"]', cov).textContent = h === 1 ? 'hour' : 'hours';
        dotEls.forEach((d, i) => d.classList.toggle('on', i < imgs / DOT));
        if (hasGsap && !reduce) G(() => gsap.to(n, { v: imgs, duration: .6, ease: 'expo.out', overwrite: true, onUpdate: () => ($('[data-cov="images"]', cov).textContent = Math.round(n.v)) }));
        else $('[data-cov="images"]', cov).textContent = imgs;
        n.v = imgs;
        range.style.setProperty('--p', ((h - +range.min) / (+range.max - +range.min) * 100) + '%');
        range.setAttribute('aria-valuetext', `${h} hours, about ${imgs} images`);
        $('[data-cov="cta"]', cov).href = `contact.html?type=wedding&hours=${h}%20hours&src=Coverage%20sizer`;
        $('[data-cov="ctatxt"]', cov).textContent = `Ask about ${h} hours`;
      };
      range.addEventListener('input', upd); upd();
    }

    /* Family playdate planner */
    const play = $('[data-playdate]', root);
    if (play) {
      const vibes = $$('[name="pd-vibe"]', play), elDate = $('[name="pd-date"]', play);
      const upd = () => {
        const v = (vibes.find(r => r.checked) || vibes[0]);
        const key = v.value, outdoor = v.dataset.outdoor === '1';
        $$('[data-pd-board]', play).forEach(b => b.classList.toggle('is-on', b.dataset.pdBoard === key));
        $$('[data-pd-text]', play).forEach(b => (b.hidden = b.dataset.pdText !== key));
        const ss = sunset(elDate.value);
        const light = $('[data-pd="light"]', play);
        if (!outdoor) light.textContent = 'Indoors, we&rsquo;ll pick a time that works around naps.'.replace('&rsquo;', '’');
        else if (ss) light.textContent = `${fmtDate(elDate.value, { weekday: 'long', month: 'short', day: 'numeric' })}: soft golden light from about ${fmtMin(minutesSF(ss) - 60)}, sunset ${fmtClock(ss)}.`;
        else light.textContent = 'Pick a date to see when the golden light starts that day.';
        const p = new URLSearchParams({ type: 'family', session: key === 'home' ? 'At home' : 'Out exploring', location: v.dataset.label });
        if (elDate.value) p.set('date', elDate.value);
        p.set('src', 'Playdate planner');
        $('[data-pd="cta"]', play).href = 'contact.html?' + p.toString();
      };
      play.addEventListener('change', upd); play.addEventListener('input', upd); upd();
    }

    /* Live date feedback on date checks */
    $$('[data-datecheck]', root).forEach(f => {
      const d = $('input[type="date"]', f), out = $('[data-dc-out]', f.parentElement) || $('[data-dc-out]', f);
      if (!d || !out) return;
      const upd = () => {
        if (!d.value) { out.textContent = out.dataset.empty || ''; out.classList.remove('is-on'); return; }
        const days = Math.round((new Date(d.value + 'T12:00:00') - new Date()) / 86400000);
        const ss = sunset(d.value);
        out.innerHTML = `<b>${fmtDate(d.value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b><span>${days > 0 ? days + ' days to go' : 'Coming right up'}</span>${ss ? `<span>Sunset in SF ${fmtClock(ss)}</span>` : ''}`;
        out.classList.add('is-on');
      };
      d.addEventListener('input', upd); d.addEventListener('change', upd); upd();
    });

    /* FAQ */
    $$('.faq__q', root).forEach(q => q.addEventListener('click', () => {
      const it = q.closest('.faq__item'); const open = !it.classList.contains('is-open');
      it.classList.toggle('is-open', open); q.setAttribute('aria-expanded', open);
      later(() => hasGsap && ScrollTrigger.refresh(), 750);
    }));
    const faqSearch = $('[data-faq-search]', root);
    const faqCats = $$('.faq-cat button', root);
    const applyFaq = () => {
      const term = (faqSearch?.value || '').trim().toLowerCase();
      const cat = faqCats.find(b => b.classList.contains('is-on'))?.dataset.cat || 'all';
      let shown = 0;
      $$('.faq__item', root).forEach(it => {
        const ok = (cat === 'all' || it.dataset.cat === cat) && (!term || it.textContent.toLowerCase().includes(term));
        it.classList.toggle('is-hidden', !ok); if (ok) shown++;
      });
      const empty = $('.faq-empty', root); if (empty) empty.style.display = shown ? 'none' : 'block';
      if (hasGsap) ScrollTrigger.refresh();
    };
    faqSearch?.addEventListener('input', applyFaq);
    faqCats.forEach(b => b.addEventListener('click', () => { faqCats.forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); }); applyFaq(); }));

    /* Enquiry (multi-step) */
    const enq = $('[data-enquiry]', root);
    if (enq) initEnquiry(enq);

    notesInit(root);
    later(() => hasGsap && ScrollTrigger.refresh(), 600);
  }

  function initEnquiry(enq) {
    const form = $('form', enq), steps = $$('.enq__step', enq), bars = $$('.enq__progress i', enq);
    const next = $('[data-enq-next]', enq), back = $('[data-enq-back]', enq), err = $('.enq__err', enq);
    const done = $('.enq__done', enq), stepLabel = $('[data-enq-steplabel]', enq);
    const sum = k => $(`[data-sum="${k}"]`);
    let s = 0;
    const typeNames = { cityhall: 'City Hall wedding', wedding: 'Wedding', elopement: 'Elopement', family: 'Family session', event: 'Other event' };
    const prices = { I: 1200, II: 1500, III: 2000 };
    const val = n => { const el = form.elements[n]; if (!el) return ''; if (el instanceof RadioNodeList) return el.value; return el.type === 'checkbox' ? (el.checked ? el.value : '') : el.value; };
    const showCoverage = () => {
      const t = val('type') || 'wedding';
      $$('[data-for]', form).forEach(g => {
        const on = g.dataset.for.split(' ').includes(t);
        g.hidden = !on; $$('input,select', g).forEach(i => (i.disabled = !on));
      });
    };
    const update = () => {
      const t = val('type');
      const put = (k, v) => { const el = sum(k); if (!el) return; el.textContent = v || '—'; el.classList.toggle('empty', !v); };
      put('type', typeNames[t]);
      put('date', val('flexible') ? (val('date') ? fmtDate(val('date')) + ' (flexible)' : 'Flexible') : fmtDate(val('date')));
      put('where', val('location'));
      put('guests', val('guests'));
      const cov = t === 'cityhall' ? (val('collection') ? 'Collection ' + val('collection') : '') : t === 'family' ? val('session') : val('hours');
      put('coverage', cov);
      put('names', val('name'));
      const tm = val('time');
      const tr = sum('time'); if (tr) { tr.closest('div').hidden = !tm; put('time', tm ? fmtMin(+tm.split(':')[0] * 60 + +tm.split(':')[1]) : ''); }
      const est = sum('estimate'), dl = sum('delivery');
      if (est) {
        if (t === 'cityhall' && prices[val('collection')]) est.textContent = '$' + prices[val('collection')].toLocaleString('en-US');
        else if (t === 'cityhall' && val('collection') === 'IV') est.textContent = 'Custom';
        else if (t === 'cityhall') est.textContent = 'From $1,200';
        else est.textContent = 'Custom';
      }
      if (dl) dl.textContent = t === 'cityhall' ? '2–3 weeks' : t === 'family' ? 'Confirmed on reply' : t ? '4–8 weeks' : '—';
      const imgs = sum('images');
      if (imgs) {
        const h = { I: 1, II: 1.5, III: 2, IV: 3 }[val('collection')] || parseFloat(val('hours')) || 0;
        imgs.textContent = t === 'cityhall' && h ? ({ 1: 100, 1.5: 150, 2: 200, 3: 300 }[h] + '+') : h && t !== 'family' ? '~' + Math.round(h * 75) : '—';
      }
    };
    const go = n => {
      s = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach((st, i) => st.classList.toggle('is-on', i === s));
      bars.forEach((b, i) => b.classList.toggle('is-done', i <= s));
      back.hidden = s === 0;
      $('span', next).textContent = s === steps.length - 1 ? 'Send my enquiry' : 'Continue';
      if (stepLabel) stepLabel.textContent = `Step ${s + 1} of ${steps.length}`;
      err.textContent = '';
      if (s === 2) showCoverage();
      const top = enq.getBoundingClientRect().top;
      if (top < 0) scrollTo(enq);
    };
    const validate = () => {
      const st = steps[s];
      for (const f of $$('[required]:not(:disabled)', st)) {
        if (f.type === 'radio') { if (!form.elements[f.name].value) { err.textContent = 'Pick one option to continue.'; return false; } }
        else if (!f.value.trim()) { err.textContent = 'Please fill in ' + (f.dataset.name || 'this field') + '.'; f.focus(); return false; }
        else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) { err.textContent = 'That email doesn’t look quite right.'; f.focus(); return false; }
      }
      return true;
    };
    const submit = async () => {
      const t = val('type');
      const tm = val('time');
      const lines = [
        `Occasion: ${typeNames[t] || ''}`, `Date: ${val('date') || 'TBC'}${val('flexible') ? ' (flexible)' : ''}`,
        tm ? `Ceremony time: ${fmtMin(+tm.split(':')[0] * 60 + +tm.split(':')[1])}` : '',
        `Location: ${val('location') || 'TBC'}`, `Guests: ${val('guests') || 'TBC'}`,
        t === 'cityhall' ? `Collection: ${val('collection')}` : t === 'family' ? `Session: ${val('session')}` : `Coverage: ${val('hours')}`,
        `Name(s): ${val('name')}`, `Email: ${val('email')}`, `Phone: ${val('phone') || '—'}`, `Heard via: ${val('heard') || '—'}`,
        val('source') ? `Started from: ${val('source')}` : '', '', val('message')
      ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''));
      let sent = false;
      const endpoint = form.dataset.endpoint || CFG.formEndpoint;
      if (endpoint) {
        try { const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) }); sent = r.ok; } catch (e) { sent = false; }
      }
      if (!sent) {
        const subj = encodeURIComponent(`${typeNames[t] || 'Enquiry'}${val('date') ? ' · ' + val('date') : ''} · ${val('name')}`);
        location.href = `mailto:${CFG.email}?subject=${subj}&body=${encodeURIComponent(lines.join('\n'))}`;
      }
      form.hidden = true; done.classList.add('is-on');
      bars.forEach(b => b.classList.add('is-done'));
      $('[data-done-name]', done).textContent = (val('name') || '').split(/[ &]/)[0] || 'friend';
    };
    next.addEventListener('click', () => { if (!validate()) return; if (s === steps.length - 1) submit(); else go(s + 1); });
    back.addEventListener('click', () => go(s - 1));
    form.addEventListener('submit', e => { e.preventDefault(); next.click(); });
    form.addEventListener('input', update);
    form.addEventListener('change', e => { update(); if (e.target.name === 'type') showCoverage(); });
    $$('input[name="type"]', form).forEach(r => r.addEventListener('change', () => later(() => s === 0 && go(1), 350)));
    // Pre-fill from the URL: every tool on the site hands its answers over here
    const p = new URLSearchParams(location.search);
    const setVal = (n, v) => { if (!v) return; const el = form.elements[n]; if (!el) return; if (el instanceof RadioNodeList) { const r = $$(`input[name="${n}"]`, form).find(x => x.value === v); if (r) r.checked = true; } else el.value = v; };
    ['type', 'date', 'guests', 'location', 'time'].forEach(k => setVal(k, p.get(k)));
    setVal('source', p.get('src'));
    if (p.get('msg')) setVal('message', p.get('msg') + '\n\n');
    const hp = p.get('hours');
    if (hp && !$$('input[name="hours"]', form).some(x => x.value === hp)) {
      // An hour count from the coverage sizer that isn't one of the presets
      const n = parseFloat(hp), ref = $$('input[name="hours"]', form).find(x => parseFloat(x.value) > n) || $('input[name="hours"][value="Not sure yet"]', form);
      if (n && ref) {
        const lab = document.createElement('label'); lab.className = 'choice';
        lab.innerHTML = `<input type="radio" name="hours" value="${n} hours"><span><b>${n} hrs</b><small>~${Math.round(n * 75)} images</small></span>`;
        ref.closest('label').before(lab);
      }
    }
    showCoverage(); ['collection', 'hours', 'session'].forEach(k => setVal(k, p.get(k)));
    update();
    go(p.get('type') && p.get('date') ? 2 : p.get('type') ? 1 : 0);
  }

  /* ---------------- Boot ---------------- */
  initPage($('main'), firstReady);
  window.addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();

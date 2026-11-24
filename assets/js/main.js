/* Daniller Photography — interactions
   Smooth scroll (Lenis) + GSAP ScrollTrigger, with graceful fallbacks. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

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
  const scrollTo = (target, offset = 0) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
    else {
      const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + offset;
      scrollTo.native(y);
    }
  };
  scrollTo.native = y => window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });

  /* ---------------- Ready gate (preloader / page transition) ---------------- */
  let readyResolve;
  const ready = new Promise(r => (readyResolve = r));

  const pre = $('.preloader');
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

  if (pre && !html.classList.contains('no-pre') && hasGsap && !reduce) {
    store.set('dp-pre', '1');
    if (lenis) lenis.stop();
    const count = $('.preloader__count span', pre);
    const obj = { v: 0 };
    const tl = gsap.timeline();
    tl.to($$('.preloader__word span', pre), { yPercent: -110, duration: 1, ease: 'expo.out', stagger: 0.045 }, 0.1)
      .to(obj, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, '0'); } }, 0)
      .to($('.preloader__bar', pre), { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to($$('.preloader__word span', pre), { yPercent: -220, duration: .7, ease: 'expo.in', stagger: 0.02 }, 1.85)
      .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, 2.15)
      .add(() => { if (lenis) lenis.start(); readyResolve(); }, 2.45)
      .add(() => pre.remove());
    // preloader word starts below; place it
    gsap.set($$('.preloader__word span', pre), { yPercent: 110 });
    if (entering) { html.classList.remove('is-entering'); }
  } else {
    if (pre) pre.remove();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(finishEnter); else finishEnter();
    setTimeout(finishEnter, 1200); // safety
  }

  /* ---------------- Page transitions ---------------- */
  const isInternal = a => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    return true;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') && href.length > 1) {
      const t = document.getElementById(href.slice(1));
      if (t) { e.preventDefault(); closeMenu(); scrollTo(t, -80); }
      return;
    }
    if (!isInternal(a) || reduce) return;
    e.preventDefault();
    store.set('dp-nav', '1');
    html.classList.add('is-leaving');
    setTimeout(() => { location.href = a.href; }, 620);
  });
  window.addEventListener('pageshow', e => { if (e.persisted) { html.classList.remove('is-leaving', 'is-entering'); closeMenu(); } });

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
    if (mcta && !document.body.classList.contains('page-contact')) mcta.classList.toggle('is-on', y > innerHeight * .7 && !footerVisible);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Menu ---------------- */
  const menu = $('[data-menu]');
  const menuBtn = $('[data-menu-btn]');
  function openMenu() {
    html.classList.add('menu-open');
    menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    $('.menu-btn__txt', menuBtn).textContent = 'Close';
    if (lenis) lenis.stop();
    hdr && hdr.classList.remove('is-hidden');
  }
  function closeMenu() {
    if (!menu || !html.classList.contains('menu-open')) return;
    html.classList.remove('menu-open');
    menu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    $('.menu-btn__txt', menuBtn).textContent = 'Menu';
    if (lenis) lenis.start();
  }
  if (menuBtn) menuBtn.addEventListener('click', () => html.classList.contains('menu-open') ? closeMenu() : openMenu());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const preview = $('.menu__preview img');
  $$('.menu__link').forEach(l => l.addEventListener('mouseenter', () => {
    const src = l.dataset.preview;
    if (!preview || !src || preview.getAttribute('src') === src) return;
    preview.style.opacity = 0;
    setTimeout(() => { preview.src = src; preview.onload = () => (preview.style.opacity = 1); }, 180);
  }));

  /* ---------------- Text splitting ---------------- */
  function splitWords(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
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
  $$('[data-split]').forEach(splitWords);

  /* Scrubbed text */
  $$('[data-scrub]').forEach(el => {
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
    ScrollTrigger.create({
      trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: true,
      onUpdate: self => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); }
    });
  });

  /* ---------------- Reveal on view ---------------- */
  ready.then(() => {
    const targets = $$('[data-reveal],[data-split],[data-media],.shead[data-line],.squiggle,[data-inview]');
    if (!('IntersectionObserver' in window) || reduce) { targets.forEach(t => t.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    targets.forEach(t => io.observe(t));
  });

  /* ---------------- Counters ---------------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count); const dec = (el.dataset.count.split('.')[1] || '').length;
    if (!hasGsap || reduce) { el.textContent = end.toFixed(dec); return; }
    el.textContent = (0).toFixed(dec);
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'expo.out', onUpdate: () => (el.textContent = o.v.toFixed(dec)) }) });
  });

  /* ---------------- GSAP scroll effects ---------------- */
  if (hasGsap && !reduce) {
    $$('[data-parallax]').forEach(el => {
      const amt = parseFloat(el.dataset.parallax) || 10;
      const t = el.tagName === 'IMG' ? el : $('img', el) || el;
      gsap.fromTo(t, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-float]').forEach(el => {
      const amt = parseFloat(el.dataset.float) || 60;
      gsap.fromTo(el, { y: amt }, { y: -amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Photo wall rows
    $$('.wall__row').forEach(row => {
      const dir = parseFloat(row.dataset.dir || 1);
      gsap.fromTo(row, { xPercent: dir > 0 ? -18 : -2 }, { xPercent: dir > 0 ? -2 : -18, ease: 'none', scrollTrigger: { trigger: row.closest('.wall'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Hero scroll-out
    const hero = $('.hero');
    if (hero) {
      gsap.to($('.hero__content', hero), { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to($('.hero__bg', hero), { scale: .94, borderRadius: 40, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }
    const ph = $('.phero__media img');
    if (ph) gsap.fromTo(ph, { yPercent: -8 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: ph.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    // Timeline line
    $$('.timeline').forEach(tl => {
      const line = $('.timeline__line', tl);
      if (line) gsap.to(line, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 80%', end: 'bottom 50%', scrub: true } });
    });
    // Stack cards scale down as next one arrives
    const stackCards = $$('.stack-card');
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      stackCards.forEach((c, i) => {
        if (i === stackCards.length - 1) return;
        gsap.to(c, { scale: .94, opacity: .65, ease: 'none', scrollTrigger: { trigger: stackCards[i + 1], start: 'top 85%', end: 'top 30%', scrub: true } });
      });
      // Horizontal pinned rails
      $$('[data-hrail]').forEach(sec => {
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
    // Floating CTA images
    $$('.cta-big__float').forEach((f, i) => {
      gsap.fromTo(f, { y: 80 + i * 20, rotate: (i % 2 ? 8 : -8) }, { y: -60 - i * 20, rotate: (i % 2 ? -4 : 4), ease: 'none', scrollTrigger: { trigger: f.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  } else {
    $$('[data-hrail] .progress').forEach(p => (p.style.display = 'none'));
  }
  // Mobile: rail progress follows native horizontal scroll
  $$('[data-hrail]').forEach(sec => {
    const track = $('.hrail__track', sec), bar = $('.progress i', sec);
    if (!track || !bar) return;
    track.addEventListener('scroll', () => {
      if (innerWidth > 900) return;
      const p = track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth);
      bar.style.transform = `scaleX(${p})`;
    }, { passive: true });
  });

  /* ---------------- Hero slideshow + word rotator ---------------- */
  const slides = $$('.hero__slide');
  const dots = $$('.hero__dots button');
  if (slides.length > 1) {
    let cur = 0, timer;
    const go = n => {
      slides[cur].classList.remove('is-on'); dots[cur] && dots[cur].classList.remove('is-on');
      cur = (n + slides.length) % slides.length;
      slides[cur].classList.add('is-on');
      if (dots[cur]) { void dots[cur].offsetWidth; dots[cur].classList.add('is-on'); }
      clearTimeout(timer); timer = setTimeout(() => go(cur + 1), 5500);
    };
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
    ready.then(() => go(0));
  }
  $$('[data-rotator]').forEach(r => {
    const words = $$('span', r);
    if (words.length < 2 || reduce) return;
    let i = 0;
    setInterval(() => {
      words.forEach(w => w.classList.remove('was-on'));
      words[i].classList.remove('is-on'); words[i].classList.add('was-on');
      i = (i + 1) % words.length;
      words[i].classList.add('is-on');
    }, 2300);
  });

  /* ---------------- Cursor + magnetic ---------------- */
  if (fine && !reduce) {
    const cur = $('.cursor'); const label = $('.cursor__label');
    if (cur) {
      html.classList.add('has-cursor');
      let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
      cur.style.opacity = 0;
      addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; if (cur.style.opacity === '0') { cx = x; cy = y; cur.style.opacity = 1; } }, { passive: true });
      const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(loop); };
      loop();
      document.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-cursor]');
        if (t) { label.textContent = t.dataset.cursor; cur.classList.add('is-big'); cur.classList.remove('is-link'); return; }
        cur.classList.remove('is-big');
        cur.classList.toggle('is-link', !!e.target.closest('a, button, label, select, input[type="date"]'));
      });
      document.addEventListener('mouseleave', () => (cur.style.opacity = 0));
      document.addEventListener('mouseenter', () => (cur.style.opacity = 1));
    }
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      el.addEventListener('mouseleave', () => (el.style.transform = ''));
    });
    // Hero polaroids follow mouse
    const pol = $('.hero__polaroids');
    if (pol) addEventListener('mousemove', e => {
      const dx = (e.clientX / innerWidth - .5), dy = (e.clientY / innerHeight - .5);
      pol.style.transform = `translate(${dx * -30}px, ${dy * -24}px)`;
    }, { passive: true });
  }

  /* ---------------- Expanding panels ---------------- */
  $$('[data-panels]').forEach(wrap => {
    const ps = $$('.panel', wrap);
    const open = p => ps.forEach(x => x.classList.toggle('is-open', x === p));
    ps.forEach(p => {
      if (fine) p.addEventListener('mouseenter', () => open(p));
      p.addEventListener('focusin', () => open(p));
    });
  });

  /* ---------------- Hover image list ---------------- */
  $$('[data-hlist]').forEach(list => {
    if (!fine) return;
    const box = document.createElement('div'); box.className = 'hover-img';
    const im = document.createElement('img'); im.alt = ''; box.appendChild(im); document.body.appendChild(box);
    let x = 0, y = 0, cx = 0, cy = 0, raf;
    const loop = () => { cx += (x - cx) * .14; cy += (y - cy) * .14; box.style.left = cx + 'px'; box.style.top = cy + 'px'; raf = requestAnimationFrame(loop); };
    list.addEventListener('mousemove', e => { x = e.clientX + 140; y = e.clientY; });
    $$('[data-img]', list).forEach(row => row.addEventListener('mouseenter', e => {
      im.src = row.dataset.img; if (!raf) { cx = x = e.clientX + 140; cy = y = e.clientY; loop(); } box.classList.add('is-on');
    }));
    list.addEventListener('mouseleave', () => { box.classList.remove('is-on'); cancelAnimationFrame(raf); raf = null; });
  });

  /* ---------------- Quotes slider ---------------- */
  $$('[data-quotes]').forEach(q => {
    const items = $$('.quote', q), imgs = $$('.quotes__media img', q), count = $('.quotes__count', q);
    let i = 0, timer;
    const show = n => {
      i = (n + items.length) % items.length;
      items.forEach((it, k) => it.classList.toggle('is-on', k === i));
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

  /* ---------------- Gallery filters + lightbox ---------------- */
  $$('[data-filters]').forEach(f => {
    const gal = document.getElementById(f.dataset.filters);
    if (!gal) return;
    const figs = $$('figure', gal);
    $$('.filter', f).forEach(b => {
      const tag = b.dataset.filter;
      const n = tag === 'all' ? figs.length : figs.filter(x => (x.dataset.tags || '').includes(tag)).length;
      const sup = document.createElement('sup'); sup.textContent = n; b.appendChild(sup);
      b.addEventListener('click', () => {
        $$('.filter', f).forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
        figs.forEach(fig => fig.classList.toggle('is-hidden', tag !== 'all' && !(fig.dataset.tags || '').includes(tag)));
        if (hasGsap) { ScrollTrigger.refresh(); if (!reduce) gsap.fromTo(figs.filter(x => !x.classList.contains('is-hidden')), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, stagger: .03, ease: 'expo.out' }); }
      });
    });
  });

  const lb = $('[data-lightbox-ui]');
  if (lb) {
    const lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb), lbCount = $('[data-lb-count]', lb);
    let list = [], idx = 0, lastFocus;
    const render = () => {
      const im = list[idx];
      lbImg.src = im.getAttribute('src'); lbImg.alt = im.alt;
      lbCap.textContent = im.closest('figure')?.dataset.cap || im.alt || '';
      lbCount.textContent = (idx + 1) + ' / ' + list.length;
    };
    const open = (gal, im) => {
      list = $$('figure:not(.is-hidden) img', gal); idx = Math.max(0, list.indexOf(im));
      render(); lastFocus = document.activeElement;
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); if (lenis) lenis.stop();
      $('[data-lb-close]', lb).focus();
    };
    const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); if (lenis) lenis.start(); lastFocus && lastFocus.focus(); };
    const step = d => { idx = (idx + d + list.length) % list.length; render(); };
    $$('[data-gallery]').forEach(gal => {
      $$('figure', gal).forEach(fig => {
        fig.setAttribute('tabindex', '0'); fig.setAttribute('role', 'button');
        fig.setAttribute('aria-label', 'Open image: ' + ($('img', fig)?.alt || 'photo'));
        fig.addEventListener('click', () => open(gal, $('img', fig)));
        fig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(gal, $('img', fig)); } });
      });
    });
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => step(1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
    });
    let sx = 0;
    lb.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
    lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  }

  /* ---------------- City Hall collection builder ---------------- */
  const builder = $('[data-builder]');
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
    const bars = { hours: $('[data-bar="hours"]', builder), images: $('[data-bar="images"]', builder), delivery: $('[data-bar="delivery"]', builder) };
    const vals = { hours: $('[data-val="hours"]', builder), images: $('[data-val="images"]', builder) };
    const mediaImgs = $$('.builder__media img', builder);
    let current = { images: 100 };
    const fmt = n => '$' + n.toLocaleString('en-US');
    const set = i => {
      const d = data[i];
      tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i); });
      if (pill) pill.style.transform = `translateX(calc(${i * 100}% + ${i * 8}px))`;
      if (hasGsap && !reduce) gsap.to(current, { images: d.images, duration: 1, ease: 'expo.out', onUpdate: () => (elImgs.textContent = Math.round(current.images)) });
      else elImgs.textContent = d.images;
      current.images = d.images;
      elPrice.innerHTML = d.price ? fmt(d.price) : 'Custom quote';
      elDesc.innerHTML = d.desc; elTitle.innerHTML = 'Collection ' + d.id + ' &middot; ' + d.title;
      elList.innerHTML = d.best.map(b => `<li>${b}</li>`).concat(['High-res edited images + download link', 'Private online gallery with printing']).map(x => x.startsWith('<li>') ? x : `<li>${x}</li>`).join('');
      bars.hours.style.transform = `scaleX(${d.hours / 3})`; vals.hours.textContent = d.label;
      bars.images.style.transform = `scaleX(${d.images / 300})`; vals.images.textContent = d.images + '+';
      mediaImgs.forEach((m, k) => m.classList.toggle('is-on', k === d.img));
      elCta.href = `contact.html?type=cityhall&collection=${d.id}`;
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => set(i)));
    builder.addEventListener('keydown', e => {
      const i = tabs.findIndex(t => t.classList.contains('is-on'));
      if (e.key === 'ArrowRight') { set((i + 1) % 4); tabs[(i + 1) % 4].focus(); }
      if (e.key === 'ArrowLeft') { set((i + 3) % 4); tabs[(i + 3) % 4].focus(); }
    });
    set(1);
  }

  /* ---------------- Spots tabs ---------------- */
  $$('[data-spots]').forEach(w => {
    const btns = $$('.spots__btn', w), panels = $$('.spots__panel', w);
    let timer;
    const set = i => {
      btns.forEach((b, k) => b.setAttribute('aria-selected', k === i));
      panels.forEach((p, k) => p.classList.toggle('is-on', k === i));
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => { set(i); clearInterval(timer); });
      if (fine) b.addEventListener('mouseenter', () => { set(i); clearInterval(timer); });
    });
    set(0);
  });

  /* ---------------- FAQ ---------------- */
  $$('.faq__q').forEach(q => q.addEventListener('click', () => {
    const it = q.closest('.faq__item'); const open = !it.classList.contains('is-open');
    it.classList.toggle('is-open', open); q.setAttribute('aria-expanded', open);
    setTimeout(() => hasGsap && ScrollTrigger.refresh(), 750);
  }));
  const faqSearch = $('[data-faq-search]');
  const faqCats = $$('.faq-cat button');
  const applyFaq = () => {
    const term = (faqSearch?.value || '').trim().toLowerCase();
    const cat = faqCats.find(b => b.classList.contains('is-on'))?.dataset.cat || 'all';
    let shown = 0;
    $$('.faq__item').forEach(it => {
      const ok = (cat === 'all' || it.dataset.cat === cat) && (!term || it.textContent.toLowerCase().includes(term));
      it.classList.toggle('is-hidden', !ok); if (ok) shown++;
    });
    $$('.faq-group').forEach(g => (g.style.display = $$('.faq__item:not(.is-hidden)', g).length ? '' : 'none'));
    const empty = $('.faq-empty'); if (empty) empty.style.display = shown ? 'none' : 'block';
    if (hasGsap) ScrollTrigger.refresh();
  };
  faqSearch?.addEventListener('input', applyFaq);
  faqCats.forEach(b => b.addEventListener('click', () => { faqCats.forEach(x => x.classList.toggle('is-on', x === b)); applyFaq(); }));

  /* ---------------- Enquiry (multi-step) ---------------- */
  const enq = $('[data-enquiry]');
  if (enq) {
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
    const fmtDate = v => { if (!v) return ''; const d = new Date(v + 'T12:00:00'); return isNaN(d) ? v : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); };
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
      const est = $('[data-sum="estimate"]'), dl = $('[data-sum="delivery"]');
      if (est) {
        if (t === 'cityhall' && prices[val('collection')]) est.textContent = '$' + prices[val('collection')].toLocaleString('en-US');
        else if (t === 'cityhall' && val('collection') === 'IV') est.textContent = 'Custom';
        else if (t === 'cityhall') est.textContent = 'From $1,200';
        else est.textContent = 'Custom';
      }
      if (dl) dl.textContent = t === 'cityhall' ? '2–3 weeks' : t === 'family' ? 'Confirmed on reply' : t ? '4–8 weeks' : '—';
      const imgs = $('[data-sum="images"]');
      if (imgs) {
        const h = { I: 1, II: 1.5, III: 2, IV: 3 }[val('collection')] || parseFloat(val('hours')) || 0;
        imgs.textContent = t === 'cityhall' && h ? ({ 1: 100, 1.5: 150, 2: 200, 3: 300 }[h] + '+') : h ? '~' + Math.round(h * 75) : '—';
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
      if (top < 0) scrollTo(enq, -100);
    };
    const validate = () => {
      const st = steps[s];
      const req = $$('[required]:not(:disabled)', st);
      for (const f of req) {
        if (f.type === 'radio') { if (!form.elements[f.name].value) { err.textContent = 'Pick one option to continue.'; return false; } }
        else if (!f.value.trim()) { err.textContent = 'Please fill in ' + (f.dataset.name || 'this field') + '.'; f.focus(); return false; }
        else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) { err.textContent = 'That email doesn’t look quite right.'; f.focus(); return false; }
      }
      return true;
    };
    const submit = async () => {
      const t = val('type');
      const lines = [
        `Occasion: ${typeNames[t] || ''}`, `Date: ${val('date') || 'TBC'}${val('flexible') ? ' (flexible)' : ''}`,
        `Location: ${val('location') || 'TBC'}`, `Guests: ${val('guests') || 'TBC'}`,
        t === 'cityhall' ? `Collection: ${val('collection')}` : t === 'family' ? `Session: ${val('session')}` : `Coverage: ${val('hours')}`,
        `Name(s): ${val('name')}`, `Email: ${val('email')}`, `Phone: ${val('phone') || '—'}`, `Heard via: ${val('heard') || '—'}`, '', val('message')
      ];
      const endpoint = form.dataset.endpoint;
      let sent = false;
      if (endpoint) {
        try { const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) }); sent = r.ok; } catch (e) { sent = false; }
      }
      if (!sent) {
        const subj = encodeURIComponent(`${typeNames[t] || 'Enquiry'}${val('date') ? ' · ' + val('date') : ''} · ${val('name')}`);
        location.href = `mailto:lydia@danillerphotography.com?subject=${subj}&body=${encodeURIComponent(lines.join('\n'))}`;
      }
      form.hidden = true; done.classList.add('is-on');
      bars.forEach(b => b.classList.add('is-done'));
      $('[data-done-name]', done).textContent = (val('name') || '').split(/[ &]/)[0] || 'friend';
    };
    next.addEventListener('click', () => { if (!validate()) return; if (s === steps.length - 1) submit(); else go(s + 1); });
    back.addEventListener('click', () => go(s - 1));
    form.addEventListener('submit', e => { e.preventDefault(); next.click(); });
    form.addEventListener('input', update); form.addEventListener('change', e => { update(); if (e.target.name === 'type') showCoverage(); });
    // Auto-advance on first step choice
    $$('input[name="type"]', form).forEach(r => r.addEventListener('change', () => setTimeout(() => s === 0 && go(1), 350)));
    // Prefill from URL
    const p = new URLSearchParams(location.search);
    const setVal = (n, v) => { if (!v) return; const el = form.elements[n]; if (!el) return; if (el instanceof RadioNodeList) { const r = $$(`input[name="${n}"]`, form).find(x => x.value === v); if (r) r.checked = true; } else el.value = v; };
    ['type', 'date', 'guests', 'location'].forEach(k => setVal(k, p.get(k)));
    showCoverage(); setVal('collection', p.get('collection')); setVal('hours', p.get('hours'));
    update();
    go(p.get('type') && p.get('date') ? 2 : p.get('type') ? 1 : 0);
  }

  /* ---------------- Newsletter ---------------- */
  $$('[data-news]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const i = $('input', f), m = $('.news__msg', f);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value)) { m.textContent = 'Please enter a valid email.'; return; }
    m.textContent = 'Thank you! You’re on the list.'; i.value = '';
  }));

  /* ---------------- Misc ---------------- */
  $$('[data-year]').forEach(y => (y.textContent = new Date().getFullYear()));
  $$('[data-to-top]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollTo(0); }));
  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
  $$('input[type="date"]').forEach(d => (d.min = minDate.toISOString().slice(0, 10)));
  window.addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();

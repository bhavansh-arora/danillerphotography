# Daniller Photography: website redesign (Code Bunny preview)

A static, multi-page site with no backend, served by GitHub Pages from the repo root at
**https://danillerphotography.codebunny.net/** (keep the `CNAME` file).

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home: logo preloader, hero slideshow, proof bento, service panels, pinned City Hall rail, story list with hover previews, reviews, process, photo wall, date check with live day/sunset feedback |
| `city-hall.html` | Main page of the pitch: collection builder, side-by-side collections, **insider's map** (a drawn sketch of City Hall with six pinned spots), **day planner** (date + ceremony time + collection → timeline, sunset and golden hour), filterable gallery with lightbox, FAQ, quick booking form |
| `weddings.html` | Approach, 12 wedding stories (swipeable on phones), **coverage sizer** (hours → images at ~75/hour), filterable gallery |
| `family.html` | Playdate sessions, two session types, "tricks", gallery, **playdate planner** (playground + date → moodboard, Lydia's words, golden-hour time) |
| `about.html` | Meet Lydia: story chapters, "Pucker up, buttercup", "I'm your gal if…", off duty |
| `kind-words.html` | All five testimonials in full |
| `faq.html` | Searchable FAQ with topic filters |
| `contact.html` | Four-step enquiry with a live summary and estimate, pre-filled from any tool on the site |
| `notes-for-lydia.html` | Unlisted (noindex) walkthrough of every upgrade, linked from the reply email |
| `404.html` | Friendly not-found page |

Add `?notes=1` to any URL to turn on **notes mode**: numbered pins on the live site explain each feature (it stays on while browsing; "Hide" turns it off).

## How it works
- **Page changes happen in place.** A panel carrying the next page's name covers the screen, the next page's `<main>` is fetched and swapped in underneath, the title/meta/nav and address bar update, then the panel lifts. Back/forward, deep links and `#section` links work. It falls back to a normal page load on any error, after a new deploy (the `main.js?v=` version differs) and with reduced motion. This avoids the iPhone Chrome/Safari jump that happens during normal page loads.
- `assets/js/main.js` has one-time setup (smooth scroll, header, menu, cursor, lightbox, footer, transitions) and `initPage(root)`, which wires up everything inside `<main>` and is undone by `destroyPage()` before each swap. Any new page feature belongs in `initPage`.
- Every tool hands its answers to the enquiry through URL params: `type`, `date`, `guests`, `location`, `collection`, `hours`, `session`, `time` (ceremony time, `HH:MM`), `msg` (pre-written note) and `src` (which tool they used). Example: `contact.html?type=cityhall&collection=II&date=2027-05-14&time=14:00`.
- Sunset times are calculated in the browser for San Francisco (standard sunrise equation, accurate to a minute or two). Golden hour is shown as "about an hour before sunset".

## Editing
Page sources live in `_build/pages/`; the shared header, menu, footer, head tags and site config live in `_build/build.py`. Rebuild with:

```bash
python3 _build/build.py
```

The build needs Pillow (`pip install pillow`) to read image sizes. It writes the pages, `sitemap.xml` and `robots.txt` to the repo root. Images use the shortcode `{{img name|alt text|extra attrs}}` (responsive `srcset` from `assets/img/name-800.webp` and `name-1600.webp`; add `eager` for above-the-fold images).

Share images (`assets/og/<page>.jpg`, 1200×630) are drawn from each page's headline and photo. Re-run after changing a headline:

```bash
NODE_PATH=/opt/node-tools/node_modules node _build/og.cjs
```

## Enquiry form
While `CONFIG["formEndpoint"]` in `_build/build.py` is empty, the form opens the visitor's email app with a pre-written email to lydia@danillerphotography.com (including the planner details and which tool they started from). To send enquiries straight to her inbox, set it to a Formspree, Basin or Getform URL and rebuild.

The footer newsletter form only shows a confirmation message. Connect it to her mailing provider before launch.

## Stack
- GSAP 3.12.5, ScrollTrigger and Lenis 1.1.13 (bundled in `assets/vendor`)
- Self-hosted fonts in `assets/fonts`: Inter Tight (display and body), Instrument Serif (italic accents), Geist Mono (labels)
- SEO: per-page titles, descriptions, canonicals, share images, schema.org business info (home), FAQ schema (FAQ and City Hall), City Hall service offers, sitemap and robots
- Supports reduced motion, keyboard navigation, screen-reader labels, and works with JavaScript off (content stays visible)

## Content for the client to confirm
- Marketing lines written for the preview: "Now booking 2026 & 2027", "Most loved" (Collection II), "Most booked" (City Hall), "City Hall dates go quickly", "2026 & 2027 dates are filling"
- Insider tips on the photo-spot map and the day-planner timings (drafted in her voice from the sample timeline; offsets: hello 30 min before the ceremony, check-in 15 min before, portraits after)
- Ceremony time choices in the planner (9:00 AM to 4:00 PM)
- The map is a stylised sketch, labelled "not to scale"; pin positions are approximate
- Playdate planner line "Indoors, we'll pick a time that works around naps" (drafted)
- The coverage sizer extends her "about 75 images an hour" average up to 10 hours (~750 images)
- Some pairings of story titles and photos on Weddings (for example Stinson Beach and Pescadero) are best guesses from her current site

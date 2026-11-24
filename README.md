# Daniller Photography: website redesign (Code Bunny preview)

This is a static, multi-page site with no backend. To host it, upload the whole folder to any static host (Netlify, Vercel, Cloudflare Pages, S3, or a `*.codebunny.net` subdomain).

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home: preloader, hero slideshow, bento stats, service panels, pinned City Hall rail, story list with hover previews, reviews, process, photo wall, date check |
| `city-hall.html` | Main page of the pitch: collection builder, side-by-side collections, map of the building's best photo spots, sample-day timeline, filterable gallery with lightbox, FAQ, pre-filled booking form |
| `weddings.html` | Approach, 12 wedding stories, the numbers, filterable gallery |
| `family.html` | Playdate sessions, two session types, "tricks", gallery |
| `about.html` | Meet Lydia: story chapters, "Pucker up, buttercup", "I'm your gal if…", off duty |
| `kind-words.html` | All five testimonials in full |
| `faq.html` | Searchable FAQ with topic filters |
| `contact.html` | Four-step enquiry with a live summary and estimate. Fields are pre-filled from URL params (`?type=cityhall&collection=II&date=2027-05-14`) |
| `notes-for-lydia.html` | Unlisted (noindex) walkthrough of every upgrade, linked from the reply email |

## Editing
The page sources live in `_build/pages/`, and the shared header, menu and footer live in `_build/build.py`. To rebuild the site:

```bash
python3 _build/build.py
```

The build needs Pillow (`pip install pillow`), which it uses to read image dimensions. Images use the shortcode `{{img name|alt text|extra attrs}}`, which expands to responsive `srcset` markup from `assets/img/name-800.webp` and `name-1600.webp`.

## Enquiry form
By default, the form opens the visitor's email app with a pre-written email to lydia@danillerphotography.com. To send enquiries straight to her inbox instead, set the form's `data-endpoint` in `_build/pages/contact.html` to a Formspree, Basin or Getform URL, then rebuild.

The footer newsletter form only shows a confirmation message. Connect it to her mailing provider before launch.

## Stack
- GSAP 3.12.5, ScrollTrigger and Lenis 1.1.13 (bundled in `assets/vendor`)
- Fonts from Google Fonts: Fraunces, Inter Tight and JetBrains Mono
- Supports reduced motion, keyboard navigation and screen-reader labels

## Confirm with Lydia before launch
- Marketing lines written for the preview: "Now booking 2026 & 2027", "Most loved" (Collection II), "Most booked" (City Hall), "City Hall dates go quickly"
- Insider tips on the photo-spot map and the sample-day timeline (drafted in her voice)
- Some pairings of story titles and photos on Weddings (for example Stinson Beach and Pescadero) are best guesses from her current site

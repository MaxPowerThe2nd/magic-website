# Project
A personal website presenting me as a professional magician and entertainer.

# Requirements
The website is fully self-owned, with no subscription costs, as cheap as possible.

# Way of working
Always do exactly one small step, then stop, explain briefly and wait for approval. Do not build anything to completion, do not assume anything that is not stated here; ask about any open points.

# Design
Mobile first: every page and every element is built for smartphones first and must work flawlessly there (readability, thumb-friendly operation, no horizontal scrollbar). Larger screens are added afterwards via media queries, not the other way around.
Side gutters: one token --gutter (clamp(1.5rem, 5vw, 5rem), i.e. at least 24px on phones and up to 80px on desktop) is used left and right by every block (header, hero, all sections, footer, mobile booking bar); no block defines its own side padding. Content sits in a centred container with a max width of about 1200px, so logo, hero text and section content share one left edge. Check layouts at 360, 390, 768, 1280 and 1920px width.

# Design direction
Positioning: modern close-up magic with humour, classic and elegant, never circus. Humour lives in wording and small surprises (button texts, FAQ, 404 page, subtle effects), never in the visuals. Must not look like a clown, children's party or circus act: no top hats, rabbits, capes, comic fonts or bright colours. Preferred words: "Zauberkunst", "Programm", "Auftritt". Avoid "Hokuspokus", "für Groß und Klein", "Spaß für die ganze Familie".
Copy: all visible website text is German, formal "Sie" towards visitors, generic masculine (no Genderstern, colon or Binnen-I). Never invent facts (durations, prices, references, contact data); use existing content or clearly marked placeholders like [TODO: Dauer].
Colors: dark navy background #0B1426 (matches the hero photo background exactly), card surface #121E36, silver/champagne accent #D9D4C7 (no gold), one muted white for text #E9E6DF, secondary text in the same colour at reduced opacity, borders in the accent at about 18% opacity. No separate contrast colour: buttons are filled in the accent with dark navy text.
Typography: exactly two fonts. Cormorant Garamond for display (name, headings, claim, quotes; never below about 1.25rem) and Jost for navigation, kickers, buttons and body text. Both are self-hosted as woff2 via Astro with font-display: swap, never loaded from Google servers.
Design tokens: one central tokens file (CSS custom properties) holds colours, fonts, type scale, spacing, radii and animation durations. All other styles reference tokens only.
Effects: every effect is a self-contained module (HTML snippet, CSS, small vanilla JS file) activated via a data attribute such as data-effect="card-flip". A small loader initialises the modules found on the page, so new effects need no changes to existing code. Progressive enhancement: without JS everything stays usable. Interactive elements are keyboard-operable with correct ARIA states, and prefers-reduced-motion replaces animations with a simple fade.
Structure: one-pager with sections in this order: navbar (hamburger menu on mobile), hero, style, event types, formats, photos and videos, testimonials, about, FAQ, contact, footer with legal notice (Impressum). A persistent booking button stays visible on mobile.
Photos: prefer images of amazed or laughing audiences over images of tricks. Optional image slots render nothing until an image is set (no empty boxes, no broken images).

# Documentation
All documentation is written in English: instruction files, commit messages, code comments, README and any other docs.

# Version control
After each approved step, commit the changes with a short, clear English commit message. Finished design states get a tag (design-v1, design-v2, ...). Alternative design variants are tried on separate branches; the main branch stays untouched until a variant is approved. Never reset, revert, switch branches, delete branches or tags, or rewrite history without explicit instruction.

# Images
Web images live in /src/images inside the project, so Astro can optimize them. Original photos are never stored in the project; they stay outside the repository. Every image added to /src/images is resized and compressed to a web-ready size first; Astro then generates the smaller variants for mobile and modern formats (mobile first, responsive images via srcset and sizes). File names are lowercase English words separated by hyphens, no spaces or special characters.

# Hosting
The site is hosted on Cloudflare Workers as static assets (no Astro adapter, no SSR) plus one small Worker for the enquiry form. Workers Builds deploys every push to main, so a push goes live immediately.
- Config: wrangler.jsonc (name "magic-website", assets.directory "./dist", main "src/worker/index.ts"); wrangler is a devDependency.
- Worker: only POST /api/anfrage runs the Worker (assets.run_worker_first ["/api/*"]); every other request is served directly from the static assets.
- Enquiry form: honeypot field, Cloudflare Turnstile (Siteverify with the Worker secret TURNSTILE_SECRET_KEY), server-side validation, then e-mail via the send_email binding EMAIL (destination restricted to reinhard.huetter.privat@gmail.com, sender formular@magicreini.com, Reply-To = enquirer). With JS the page sends via fetch (JSON response); without JS the Worker redirects to /#anfrage-ok or /#anfrage-fehler.
- Secrets never go into the repository. TURNSTILE_SECRET_KEY is set in the Cloudflare dashboard; for local tests it lives in .dev.vars (git-ignored) with the official Turnstile test secret.
- Turnstile sitekey: public constant in src/data/contact.ts; override at build time with PUBLIC_TURNSTILE_SITE_KEY (local tests: 1x00000000000000000000AA).
- Local test of the form: PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build, then npx wrangler dev; sent mails are only simulated and written to .wrangler/tmp/email.
- Build: npx astro build (output in ./dist).
- Local test of the built site: npx wrangler dev (http://localhost:8787).
- Deploy: npx wrangler login once, then npx wrangler deploy.
- Domain: set `site` in astro.config.mjs once the domain is registered (currently [TODO: Domain]) and connect the domain to the Worker in the Cloudflare dashboard.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

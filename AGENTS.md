# Project
A personal website presenting me as a professional magician and entertainer.

# Requirements
The website is fully self-owned, with no subscription costs, as cheap as possible.

# Way of working
Always do exactly one small step, then stop, explain briefly and wait for approval. Do not build anything to completion, do not assume anything that is not stated here; ask about any open points.

# Design
Mobile first: every page and every element is built for smartphones first and must work flawlessly there (readability, thumb-friendly operation, no horizontal scrollbar). Larger screens are added afterwards via media queries, not the other way around.

# Design direction
Style: classic variety-show elegance with a wink. Professional and trustworthy for corporate clients and weddings, entertaining and humorous in small details. Humor lives in copy and micro-interactions (button texts, FAQ, 404 page, subtle effects), never in the base layout, and is used sparingly.
Colors: dark stage-like base (deep midnight blue or burgundy), warm gold or cream as accent, at most one playful contrast color for buttons and calls to action.
Typography: characterful serif display font for headings (vintage poster / classic magic show feel), clean highly readable sans-serif for body text. Fonts are self-hosted via Astro, never loaded from Google servers.
Structure: one-pager with sections in this order: navbar (hamburger menu on mobile), hero, show formats / booking occasions, photos and videos, testimonials, about, FAQ, contact, footer with legal notice (Impressum). A persistent booking button stays visible on mobile.
Photos: prefer images of amazed or laughing audiences over images of tricks.

# Documentation
All documentation is written in English: instruction files, commit messages, code comments, README and any other docs.

# Version control
After each approved step, commit the changes with a short, clear English commit message. Finished design states get a tag (design-v1, design-v2, ...). Alternative design variants are tried on separate branches; the main branch stays untouched until a variant is approved. Never reset, revert, switch branches, delete branches or tags, or rewrite history without explicit instruction.

# Images
Web images live in /src/images inside the project, so Astro can optimize them. Original photos are never stored in the project; they stay outside the repository. Every image added to /src/images is resized and compressed to a web-ready size first; Astro then generates the smaller variants for mobile and modern formats (mobile first, responsive images via srcset and sizes). File names are lowercase English words separated by hyphens, no spaces or special characters.

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

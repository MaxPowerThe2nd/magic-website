# Website content – Reinhard Hütter

Overview of everything on the website: pages, sections, texts, effects and where each piece of content is maintained.
Visible website copy is German; this document is English (see AGENTS.md). Status: October 2026.

> **Hint: the testimonials section ("Stimmen") is currently hidden.**
> It is switched off in `src/data/sections.ts` (`testimonials: false`) because there are no real client quotes yet.
> Setting it to `true` shows the section again and adds "Stimmen" back to the menu. Before that, replace the placeholder quotes in `src/components/Testimonials.astro` with real ones.

## Pages

| URL | Content |
|---|---|
| `/` | One-pager with all sections described below |
| `/impressum` | Legal notice – placeholder only, content still missing |
| `/datenschutz` | Privacy policy – placeholder only, content still missing |
| `/gallerie` | Redirects to `/#fotos` (former subpage) |
| `/kontakt` | Redirects to `/#kontakt` (former subpage) |

Page title: "Reinhard Hütter – Zauberkünstler für Firmenevents & Hochzeiten".
Meta description and Open Graph description: "Moderne Zauberkunst mit Humor für Firmenevents, Hochzeiten und private Feiern. Tischzauberei und Salon-Show – über 10 Jahre Erfahrung."

## Header

- Light bar (`#E9E6DF`) with the logo "Reinhard Hütter" and below it "ZAUBERKÜNSTLER".
- Menu: Shows · Fotos & Videos · Über mich · FAQ · Kontakt (plus "Stimmen" when that section is switched on). The item of the section in view is underlined.
- Phones: hamburger menu. Without JavaScript the links stay visible.

## Sections of the one-pager (in order)

Backgrounds alternate automatically between `--bg` (#1C2A4A) and `--bg-deep` (#0B1426), also when a section is hidden.

### 1. Hero (`#hero`)
- Heading (h1): "Moderne Zauberkunst für Ihr Event"; the name "Reinhard Hütter" is part of the heading for search engines only.
- Three lines with diamonds: "Über 10 Jahre Erfahrung", "Tischzauberei & Salon-Show", "Verblüffend und mit Humor".
- Button "Show anfragen" (jumps to the contact section).
- Cut-out portrait (`src/images/hero-portrait.webp`) with a static stage light behind it.
- Effects:
  - Floating card backs behind the figure (light mouse parallax on desktop).
  - Silver shine sliding once over the word "Zauberkunst".
  - Burning card: an ace left of the figure catches fire right after loading, burns away its top right corner (slowly at first, then faster) and keeps burning lightly. Restarts on every page load.
- Showreel play button: appears automatically once a video is set in `src/data/media.ts` (currently empty).

### 2. Style (`#stil`)
- Heading: "Zauberkunst mit Humor".
- Text: "Staunen und Lachen gehören zusammen. Genau das verbinde ich: verblüffende Zauberkunst, ganz nah an den Gästen, gewürzt mit pointiertem Humor. Über zehn Jahre Zauberkunst und die Erfahrung als Schauspieler auf der Theaterbühne sorgen dafür, dass jede Szene Timing hat und jede Pointe sitzt, ob direkt am Tisch oder als Salon-Show. So entstehen Momente, die den Gästen lange im Gedächtnis bleiben."
- Optional large event photo (slot, currently empty).

### 3. Occasions interlude (`#shows`)
- One centred sentence on two levels: "FIRMENEVENTS · PRIVATFEIERN · HOCHZEITEN" and "… oder Scheidungen. Ein wenig Magie schadet nie."
- The menu item "Shows" points here.

### 4. Formats (`#formate`)
- Kicker "Formate", heading "Zwei Formate, ein Ziel: Staunen".
- Two playing cards that turn over on tap or click ("Details ansehen" / "Zurück"):
  - **Tischzauberei** – "Close-up / Table Hopping". Back: Ablauf (von Tisch zu Tisch, Zauberkunst in den Händen der Gäste), Dauer [TODO], Gästeanzahl [TODO], Platzbedarf (keine Bühne nötig), Passender Moment (Empfang, Dinner Magic zwischen den Gängen).
  - **Salon-Show** – "Show für die ganze Gruppe". Back: Ablauf (Show im Sitzen, keine Bühne nötig), Dauer [TODO], Gästeanzahl [TODO], Platzbedarf [TODO], Passender Moment [TODO].

### 5. Photos & videos (`#fotos`)
- Photos only, without visible text (heading and descriptions exist for screen readers only).
- Current photos: `cards-stage-child.webp`, `rope-magic-stage.webp`.
- More photos: add the file to `src/images` and an entry in `src/components/Gallery.astro`.

### 6. Testimonials (`#stimmen`) – currently hidden
- Heading "Was Gäste sagen" with three placeholder quotes (no real clients yet).
- See the hint at the top of this document.

### 7. About (`#ueber-mich`)
- Heading: "Hinter dem Vorhang".
- Lead: "Seien Sie gegrüßt! Ich bin Reinhard Hütter – Zauberkünstler, Entertainer und leidenschaftlicher Geschichtenerzähler."
- Text about 10 years of combining magic and acting, close-up magic, table hopping and salon shows; signed "Reinhard Hütter".
- Optional portrait photo (slot, currently empty).

### 8. FAQ (`#faq`)
- Heading: "Gut zu wissen". Questions open and close on click:
  - Wie lange dauert ein Auftritt?
  - Brauche ich eine Bühne?
  - Für wie viele Gäste eignet sich das?
  - Was kostet ein Auftritt?
  - Können Sie auch meinen Chef verschwinden lassen? (humorous answer)
- **To check:** the answers to "Wie lange dauert ein Auftritt?" (20 minutes up to several hours) and "Für wie viele Gäste eignet sich das?" (up to several hundred guests) contain figures that were never confirmed. Please verify or correct them.

### 9. Contact (`#kontakt`)
- Heading "Bereit für ein kleines Wunder?" and the lead "Erzählen Sie mir von Ihrem Anlass. Je mehr ich weiß, desto passender wird das Programm."
- **Silver tray with cloche** (the only place with the tray motif): the button "Ist das Ihre Karte? – Kontaktdaten anzeigen" lifts the cloche and reveals a business card with name, phone, e-mail and the button "Show anfragen". About 3 s after the section comes into view the cloche lifts briefly as a hint.
- **Enquiry form**: Datum, Ort, Anlass, Gästeanzahl, gewünschtes Format, Nachricht, Name*, E-Mail*, Telefon; privacy note with a link to the privacy policy.
  - Sent by the Worker (`src/worker/index.ts`) as a plain-text e-mail to reinhard.huetter.privat@gmail.com, sender "Website magicreini.com" <formular@magicreini.com>, subject "Neue Anfrage: <Anlass> – <Name>". Replying in Gmail goes straight to the enquirer.
  - Protected by Cloudflare Turnstile (only visible when an interaction is needed) and an invisible honeypot field.
  - Confirmation: "Ihre Anfrage ist angerichtet. Ich melde mich in Kürze bei Ihnen!" Errors show a German message with kontakt@magicreini.com as alternative. Without JavaScript the form cannot pass Turnstile and shows that alternative.

## Footer

Name, phone, e-mail, links to Impressum and Datenschutz, copyright.

## Mobile booking bar

On phones a bar with call and e-mail buttons and "Show anfragen" appears at the bottom once the hero is scrolled past; it hides again at the contact section.

## Contact data

Maintained in one place, `src/data/contact.ts`:
- Phone: +43 677 62179694
- E-mail: kontakt@magicreini.com (Email Routing forwards it to reinhard.huetter.privat@gmail.com)

## Where content is maintained

| What | File |
|---|---|
| Contact data, form service | `src/data/contact.ts` |
| Showreel video | `src/data/media.ts` |
| Show/hide sections (testimonials) | `src/data/sections.ts` |
| Colours, fonts, sizes, spacing | `src/styles/tokens.css` |
| Section texts | `src/components/*.astro` (one file per section) |
| Photos | `src/images/` (web-ready WebP; originals stay outside the repository) |

## Open points

- Impressum and Datenschutz texts.
- Privacy policy: the draft section on the form and Turnstile must be checked legally.
- Durations, guest numbers and space requirements of both formats.
- Verify the figures in the FAQ answers (see above).
- Real testimonials, then switch the section back on.
- Showreel video, more photos (preferably amazed or laughing guests), optional photos for Style and About.
- Domain (`site` in `astro.config.mjs`), Open Graph image.
- Planned but not built yet: video slider and photo lightbox in the gallery, 404 page.

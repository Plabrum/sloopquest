# Landing — Remaining TODOs

A punch list of everything the landing page promises but doesn't yet deliver. Audit performed against the current `src/` after the initial design pass.

---

## 1. Dead links — routes referenced but not built

These all 404 today. Each row notes where the link lives so it can be wired up or rewritten.

### Primary CTA destinations
| Route | Referenced from | Notes |
| --- | --- | --- |
| `/get-started` | `nav.tsx:38`, `hero.tsx:54`, `cta.tsx:42` | Where every "Begin a survey" button points. Highest-priority page to ship — probably a signup form or a direct hand-off into the app. |
| `/sign-in` | `nav.tsx:32` | Either build it or hand off to the app's existing sign-in. |
| `/sample-report.pdf` | `cta.tsx:53` | Static asset. Generate a real example PDF (or branded mock) so "Download a sample report" delivers. |

### Marketing pages (in nav)
| Route | Referenced from | Notes |
| --- | --- | --- |
| `/field-guide` | `nav.tsx`, `hero.tsx:63`, `footer.tsx:18` | Promised three times — should exist. Could be the docs/onboarding hub. |
| `/about` | `nav.tsx` (label: "Almanac"), `footer.tsx:20` | Page exists but stubbed — see §2. |
| `/pricing` | `nav.tsx`, `footer.tsx:28` | Page exists but stubbed — see §2. |

### Footer columns
The footer renders 15 links across three columns. None of these routes exist yet.

**Workspace column** — `footer.tsx:8–12`
- [ ] `/workspace` — "The document"
- [ ] `/templates`
- [ ] `/findings`
- [ ] `/reports`
- [ ] `/ai` — "AI surveyor"

**Almanac column** — `footer.tsx:18–22`
- [ ] `/field-guide`
- [ ] `/changelog`
- [ ] `/about` (stubbed)
- [ ] `/careers`
- [ ] `/contact` (stubbed)

**Quartermaster column** — `footer.tsx:28–32`
- [ ] `/pricing` (stubbed)
- [ ] `/api`
- [ ] `/status`
- [ ] `/security`
- [ ] `/terms` — "Terms & privacy"

### Social
All three social links point to `#` — `footer.tsx:140, 143, 146`
- [ ] Twitter
- [ ] GitHub
- [ ] RSS

**Decision before wiring:** trim the footer to only the columns we actually intend to build. Better to ship 4 real links than 15 broken ones.

---

## 2. Routes that exist but are stubs

These render "Coming soon" placeholders inherited from the original scaffold. They need real content (and a layout that matches the new design system — they currently use the old shadcn `text-muted-foreground` tokens).

- [ ] `src/app/about/page.tsx` — `Coming soon.`
- [ ] `src/app/pricing/page.tsx` — `Coming soon.`
- [ ] `src/app/contact/page.tsx` — `Coming soon.`

Each needs:
- Real copy
- A layout consistent with the landing (Fraunces/Newsreader, paper background, hairline rules)
- Nav and footer shared chrome (currently only the landing page includes them — these stub pages have no nav at all)

**Decision:** extract `<Nav />` and `<Footer />` into the root `layout.tsx` so every page gets them, instead of duplicating across pages.

---

## 3. Forms & interactions

### Newsletter signup
`footer.tsx:65–84` — purely visual right now.
- [ ] Submit handler
- [ ] Email validation
- [ ] Success / error states (probably an in-place message, not a route change)
- [ ] Backend: subscription store + confirmation email
- [ ] Decide on provider (Resend, ConvertKit, Loops, etc.)

### Workspace mock interactivity
`anatomy.tsx` — entirely static. That's correct for a landing visual, but worth noting in case we later want:
- [ ] Light hover affordances on field cards (subtle, so it doesn't feel like a live app)
- [ ] A "Watch a 30-second tour" overlay button that swaps the static mock for a real loom/screencast

---

## 4. Placeholder content & made-up facts

Anything user-facing that's invented and would be embarrassing if a customer caught it.

### Marketing copy
- [ ] `footer.tsx:99` — `~1,200 surveyors aboard` (fake stat). Replace with real number, drop the line, or change to a softer phrasing like "Used dockside in N harbors."
- [ ] `specifications.tsx:104` — `M. Carrick · Marine Surveyor · AMS® · Bristol, R.I.` pull quote attribution. Get a real testimonial (with permission) or remove the figure.
- [ ] `specifications.tsx:98–101` — the quote itself ("Survey on the dock. Publish before dinner…") is mine, not a real surveyor's. Replace with an actual quote.

### Brand metadata
- [ ] Coordinates `41°22′N — 70°57′W · Newport, R.I.` appear in the hero strip, anchor glyph block, and a few captions. Pin this to a real HQ (or remove if Sloopquest doesn't have one).
- [ ] Roman-numeral years (`MMXXVI`) appear throughout. Confirm we want this convention before locking it in — it's stylish but creates a copy-update task every January.

### Specifications copy
`specifications.tsx:8–24` — every line is plausible but unverified.
- [ ] `Field types — 14` (verify against the template schema)
- [ ] `Storage — AES-256, AWS us-east-1` (confirm the actual region/encryption)
- [ ] `Compliance — NAMS-aligned, SOC 2 in progress, GDPR-ready` (legal sign-off before we publish any of these)
- [ ] `Offline capture — Q3 MMXXVI` (confirm date or remove)
- [ ] `~1,200 surveyors aboard` (same as above)

### Workspace mock data
`anatomy.tsx` uses S/V Aurora, HIN `USHIN8421J122`, client J. Sallenger, etc. These are fine as illustrative — flag here so we don't accidentally swap in a real customer's data later. The HIN format should be valid-looking (starts with country code, 12 chars) — verify before we ship.

---

## 5. SEO, sharing, and platform polish

- [ ] **Favicon.** Console logs a 404 for `/favicon.ico`. Make a `✦`-style favicon (compass-mark) at multiple sizes and add `apple-touch-icon`.
- [ ] **Open Graph + Twitter card metadata** in `layout.tsx`. Currently only `title` and `description` are set. Add:
  - `og:image` (1200×630, generated from the hero or a custom card)
  - `og:type`, `og:site_name`, `og:locale`
  - `twitter:card`, `twitter:image`, `twitter:creator`
- [ ] **Structured data** — `Organization` + `SoftwareApplication` JSON-LD for rich snippets.
- [ ] **Sitemap + robots.txt** — Next.js can generate via `app/sitemap.ts` and `app/robots.ts`.
- [ ] **Analytics** — Vercel Analytics or Plausible. Decide what to track on the landing (CTA clicks, scroll depth into anatomy section, newsletter signups).
- [ ] **404 page** — currently default Next.js fallback. Build a branded `not-found.tsx` so the design holds together when these dead links inevitably get hit.

---

## 6. Accessibility & responsive polish

Quick audit — nothing is broken, but a few areas worth strengthening before launch.

- [ ] **Color contrast** — `text-ink-muted` (#5b6976) on `bg-paper` (#f1e8d4) is roughly 4.5:1 — passes AA for normal text but is close. Double-check the mono labels at 10px against WCAG.
- [ ] **Reduced motion** — the compass rose rotates and the rust dot pulses. Wrap `.drift` and `.pulse-dot` in `@media (prefers-reduced-motion: no-preference)` (`globals.css:91–98`).
- [ ] **Focus styles** — currently relying on browser defaults. Custom buttons (the ink-on-paper "Begin a survey") should have a visible `:focus-visible` ring in brass.
- [ ] **Anchor glyph + compass rose** — these are decorative SVGs and correctly marked `aria-hidden`. Confirm no functional content is lost to screen readers.
- [ ] **Workspace mock** — currently a `<div>` soup. Decide whether screen readers should announce it as a figure with a caption or hide it entirely (`aria-hidden`) since it's decorative.
- [ ] **Mobile metadata strip** drops the coordinates entirely below `lg` — fine for layout, but the Newport, R.I. brand cue disappears. Consider showing it differently on small screens, or leaving as-is and surfacing it elsewhere in the mobile flow.

---

## 7. Tech debt the design pass left behind

- [ ] **Unused shadcn Button** — `src/components/ui/button.tsx` is no longer imported anywhere. Either delete it or keep it for future shadcn components.
- [ ] **`components.json` `baseColor: "neutral"`** — shadcn-config still points at the original neutral palette. If we add more shadcn components, they'll generate against the wrong tokens. Either update the config to map to our paper/ink tokens or remove shadcn entirely.
- [ ] **Old shadcn `--color-*` variables** were removed from `globals.css`. If any later shadcn install reintroduces them, they'll clash with the almanac palette — check on next `shadcn add`.
- [ ] **`orval` codegen** is configured in `package.json` (`pnpm codegen`) and `orval.config.ts` exists, but no API hooks are imported on the landing yet. Confirm whether the landing actually talks to the backend, or remove the dependency for build-speed wins.

---

## 8. Stretch / nice-to-have

Not blocking launch, but ideas worth a beat of thought.

- [ ] **Real screenshot in §III** instead of the HTML mock — once the actual workspace ships, swap in a high-DPI image (or layer both: mock at first paint, real image lazy-loaded).
- [ ] **A short hero video** — 8-second loop of a surveyor's hand tapping a finding into an iPad — behind/under the compass rose. Restraint: only if it ships without slowing LCP.
- [ ] **Field Guide as an actual MDX collection** — would give the "Almanac" brand somewhere real to live.
- [ ] **Print stylesheet** — the design is editorial; a `@media print` rule that strips the dark spec section and the rail decoration would let surveyors literally print this page if they want to.
- [ ] **Theme toggle** — the dark Specifications section already proves a dark variant of the brand works. A full dark mode is on the table.

---

## Priority pass

If we only do one thing: **delete or rewrite the dead links.** A landing page with 15 broken footer links reads as "early prototype" no matter how nice the typography is. Either ship the routes or trim the nav and footer to what we have. The CTA target (`/get-started`) is the only must-build before this page is worth driving traffic to.

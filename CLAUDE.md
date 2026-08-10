see @AGENTS.md

# Atlas Copco Group migration — agent notes (learnings & gotchas)

This project migrates https://www.atlascopcogroup.com/en to AEM Edge Delivery /
Document Authoring (DA). The notes below are hard-won; read them before touching
images, content, the header/footer, or the import pipeline.

## Deployment / serving model (two separate tracks — internalize this)
- **Code** (`blocks/`, `styles/`, `scripts/`, importer files) ships via **git push →
  AEM Code Sync**. Appears on aem.page ~30-50s after push.
- **Content** (`content/**`, incl. `nav`, `footer`, page docs) is **gitignored** and
  ships to **Document Authoring** (admin.da.live). Re-running the importer only
  regenerates the *local* `content/*.plain.html`; it does NOT publish.
- **A fix that touches BOTH tracks needs BOTH steps.** Most "it works locally but the
  live page is unchanged" reports are the content track being stale: e.g. a parser change
  regenerates local content but the deployed page still serves the last DA publish. If a
  fix is CSS/JS-only it goes live on push alone; if it changes generated content
  (parser/transformer output), it ALSO needs a DA re-publish. State which track(s) a
  change touches before claiming it's live.
- **Publishing a page to DA yourself** (once the DA opt-in is on — see below):
  1. Wrap the plain.html in a page document and POST it to the DA source API:
     ```
     { printf '<body>\n<header></header>\n<main>\n'; cat content/<path>.plain.html; \
       printf '\n</main>\n<footer></footer>\n</body>\n'; } > /tmp/doc.html
     curl -X POST -F "data=@/tmp/doc.html;type=text/html" \
       "https://admin.da.live/source/blefebvre/da-aug-6/<path>.html"
     ```
  2. Trigger the preview build (this is what updates the aem.page URL):
     `curl -X POST "https://admin.hlx.page/preview/blefebvre/da-aug-6/main/<path>"`
  Both return HTTP 200 on success. Org/repo = `blefebvre/da-aug-6`.
- Root paths (`/nav`, `/footer`, `/en`) are served by the DA backend on BOTH local
  (`aem up` proxies them) and the aem.page preview. The `/content/*` prefix serves the
  LOCAL working copy (dev only; `/content/*` 404s on preview).
- **Boilerplate leak gotcha:** until migrated content is published to DA, the backend
  serves Adobe's DEFAULT boilerplate `/footer` (and would for `/nav`). So header.js /
  footer.js fetch **`/content/<name>` FIRST**, then fall back to the root path — otherwise
  they silently pick up boilerplate. Do not reorder those fetches.
- Deploy opt-ins live in **Settings → LLM Permissions** (git creds; and Adobe IMS/DA
  creds for admin.hlx.page + DA uploads). Never accept a pasted token; if a push or DA
  upload/preview 401s, ask the user to enable the toggle. Credentials are injected
  automatically — no token needed in the command.

## Scene7 / Dynamic Media images (READ THIS before any image change)
Source images are Scene7 IS/Image URLs served **protocol-relative**:
`//atlascopco.scene7.com/is/image/atlascopco/<name>`. They have **no file extension**, so
the importer never turns them into `<img>` — they arrive as `<a href="scene7-url">alt</a>`
anchors and are rebuilt into responsive `<picture>` at render time.

Pipeline (all four pieces must stay consistent):
1. `tools/importer/transformers/atlascopcogroup-dm-images.js` (afterTransform) rewrites
   each DM `<img>`/wrapper into an anchor carrying the DM URL.
2. `tools/importer/import-homepage.js` orchestrates parsers + transformers. **It is
   bundled** to `tools/importer/import-homepage.bundle.js` (esbuild IIFE, global
   `CustomImportScript`) — see "Import pipeline" below.
3. `scripts/scripts.js` → `buildDynamicMediaImages()` (the auto-block / `window.__dmRender__`)
   converts those anchors to `<picture>` with a width-descriptor srcset + `sizes`.
4. Block decorators call `createOptimizedPicture(img.src, ...)`; a patched aem.js hook
   delegates DM URLs to `window.__dmRender__` so query params survive.

**THE PROTOCOL BUG (hit twice — do not regress):** if the DM anchor href stays
protocol-relative (`//atlascopco.scene7.com/...`), **Document Authoring strips the host
on publish**, turning it into a root-relative `/is/image/...`. The render-time guard
`detectDynamicMediaUrl` rejects relative URLs, so no `<picture>` is built and **no images
render on the published site**. Fix lives in the **transformer**: it forces an absolute
`https://` URL (`toAbsoluteHttps`) before writing the href/title. Keep DM hrefs absolute
`https://` end-to-end. Verify after any import: `grep -c 'href="//atlascopco' content/en.plain.html`
must be 0, and `grep -c 'href="https://atlascopco.scene7.com' content/en.plain.html` == 17.

**Lazy-load deadlock (separate image gotcha):** a DM `<img>` with `height:auto` and no
reserved box computes to height 0; because it's 0px tall it never intersects the viewport,
so `loading="lazy"` never fires and it never loads — permanently blank below the fold.
Always reserve space with an explicit `aspect-ratio` on block image slots
(see `columns-media.css`). The above-the-fold hero is rendered `eager` by the auto-block.

**Oversized OG/metadata image blocks DA preview (>20 MB):** DA refuses to preview a page
whose source references an image over 20 MB, with:
`Unable to preview '/…​.md': source contains large image: … exceeds allowed limit of 20.00MB`.
The culprit is usually the page's `og:image` — `createMetadata` copies the source's
og:image URL verbatim into the Metadata block's "Image" row. reports-and-presentations'
og:image was a raw AEM DAM original (`…/Annual-General-Meeting-2023.jpg`, 33.7 MB). The DAM
host IGNORES `?width=`/`?wid=` (always serves the full original), so it can't be downscaled
via URL, and re-encoding bytes in the in-browser importer isn't feasible. Fix:
`tools/importer/transformers/atlascopcogroup-metadata-image.js` — a Scene7 og:image is
capped with `?wid=1200`; a non-DM raw original has its Metadata "Image" ROW dropped (page
falls back to a default OG image). GOTCHA: `createMetadata` builds the Metadata block as a
`<table>` (th "Metadata" + `<tr><td>Image</td><td><img></td>`), NOT `.metadata` divs (those
appear later, post `md2da`), and it runs in the import script's step 5 — AFTER the
afterTransform hook. So this transformer must be invoked EXPLICITLY right after
`WebImporter.rules.createMetadata(...)`, matching on the `<table>`, not registered in the
`transformers` array. Verify after import: `grep -c 'Annual-General-Meeting-2023'` == 0 and
0 raw `<img>` / `content/dam/*.jpg` refs remain (Scene7 anchors are bounded at render).

## Import pipeline (how to re-import content)
- Runner: `node <excat>/skills/excat-content-import/scripts/run-bulk-import.js
  --import-script tools/importer/import-homepage.bundle.js --urls tools/importer/urls-homepage.txt`
- **Point `--import-script` at the `.bundle.js`, NOT `import-homepage.js`.** The runner
  injects the file as a plain `<script>` and expects `window.CustomImportScript`; the raw
  ES-module script uses `import` and fails with "CustomImportScript.default not found".
- **After editing any parser/transformer you MUST rebuild the bundle** or the import uses
  stale logic: `npx -y esbuild@0.28.1 tools/importer/import-homepage.js --bundle
  --format=iife --global-name=CustomImportScript --outfile=tools/importer/import-homepage.bundle.js`
- A failed import run does NOT overwrite existing `content/*.plain.html` (safe to retry).
- Content-completeness ~80.7% is expected here (boilerplate stripped, tags flattened); it
  is a heuristic, not a failure.
- **Markdown round-trip drops some links:** a link nested inside a heading
  (`<h3><a>…</a></h3>`) does NOT survive html2md — the href is lost. Emit destinations as a
  standalone CTA paragraph (`<p><a href>…</a></p>`) instead, which round-trips reliably
  (see cards-news parser). NOTE: even a standalone press-card "Read more" link was observed
  being dropped by the bulk runner's full-page html2md (parser validates correct in
  isolation) — an open issue in the excat plugin's converter, outside this repo.

## Header / footer (already built — do not regress)
- Header is a **SOLID teal (#054E5A) fixed bar at ALL scroll positions** — NOT a
  transparent overlay that turns teal on scroll. Implemented with `position:fixed` +
  `body>header{height:96px}` (80px mobile) so the hero starts below it and it stays pinned.
  `position:sticky` FAILS here: the wrapper's containing block is the short `<header>` and
  `<body>` is the scroller in the preview, so a sticky bar scrolls away. No scroll observer.
- Locations/English utility cluster: the EDS fragment nests both in a
  `.default-content-wrapper`; header.js hoists them to direct children of `.nav-tools` so
  they lay out inline on the right (divider + uppercase + globe), not stacked.
- Footer bg is a DARKER teal `#04424D` (var `--brand-teal-dark`), distinct from the header.
- "Manage cookies": DA rewrites a fragment-only `#consent` href to `/` on publish, so
  footer.js matches the link by its **visible label** ("Manage cookies"), re-asserts
  `#consent`, and wires preventDefault + OneTrust toggle. Don't key solely on the href.

## Design system quick reference (measured from source @1308/1440)
- Fonts: Noto Serif (headings, weight 400), Noto Sans (body). Brand teal `#054E5A`,
  dark teal `#04424D`, sand `#E1B77E`, pale gold `#FCF8F2`, hero-band grey `rgb(243,246,247)`,
  external-link blue `rgb(16,114,185)`, body grey `rgb(62,63,65)`.
- Section-title default-content H2s that introduce a cards block are **40px/56px**
  (press releases 40/48) — see the scoped rule in `styles.css`. Card H3s are 32/44,
  press-card H3s 24/31.92 w600, cards-nav H2/H3 32/48, hero H1 56/63.84.
- Top-of-page hero: breadcrumb 14px `rgb(62,63,65)` horizontal with ">" `::after`
  separators (last crumb unlinked); eyebrow 16px/600/uppercase/1px `#04424D`; H1 56px;
  lede 24px. H1 + lede both constrained to an 818px column.
- Section styles: `.dark` teal, `.extra-dark` dark-teal, `.bg-gold` pale-gold, `.hero-light`
  grey hero band; `filled-gold` keeps the SECTION transparent — the gold box lives on the
  block's inner content.
- cards-nav strip overlaps the hero by -60px (desktop) — the source's signature pull-up.
- **Measuring the source:** the source's AEM accordion PERSISTS expansion as you click
  through tabs, so a page you've been interacting with shows stale open-state. Reload the
  source fresh before reading authored defaults. Its collapsed panels are `display:none`
  (height 0), same as our native `<details>` — nothing to pad-match there.

## Verification gotchas (measuring the preview) — each of these cost a round
- The preview iframe defaults to a narrow width (~708px) = the mobile branch. **Assert
  `window.innerWidth >= 900` (or >=1300 for the user's 1308 comparisons) inside the iframe
  before trusting desktop measurements**, and sample computed styles after ~1s for any
  transition. Prefer `browser_evaluate` returning compact JSON over screenshots (token cost).
- **Verify overflow at REAL mobile widths (375/390/414), assuming a scrollbar gutter.**
  `100vw` counts the scrollbar column only on classic-scrollbar browsers, so a `100vw`
  full-bleed overhangs ~7px there but measures 0 on an overlay-scrollbar browser (what the
  test harness uses). Use the `margin:0; width:auto` full-bleed instead (see the
  section-metadata band notes) and confirm `scrollWidth === clientWidth` at all three.
- **Reload before measuring DEFAULT state.** Clicking tabs/accordions PERSISTS state (both
  on our page and on the live source's AEM components), so a page you've interacted with
  shows stale open-state. Mis-reading this cost a full round on the accordion expansion —
  reload, then measure.

## Section-metadata → CSS class pattern (how full-width bands are built)
`blocks/section-metadata/section-metadata.js` turns a `| style | <value> |` Section
Metadata row into a CSS class on the `.section` (space-separated → multiple classes),
then removes itself from the DOM. This is the mechanism for every full-bleed band on the
page — do it in a **transformer** (emit a Section Metadata table + `<hr>` boundary) so it
survives re-imports, never a selector-based override in CSS.
- **Full-bleed without 100vw:** a `.section` is a direct child of `<main>` (full content
  width, no side padding), so `margin:0; width:auto` fills it edge-to-edge. Do NOT use
  `width:100vw; margin-left:calc(50% - 50vw)` — on browsers with classic (gutter)
  scrollbars `100vw` counts the scrollbar column and the band overhangs by ~7px →
  horizontal scroll on mobile. (This bit us on `.section-tabs-dark`; now fixed. Note it
  only reproduces on classic scrollbars — an overlay-scrollbar browser measures 0, so
  verify overflow at 375/390/414 assuming a gutter.)
- **Hero light band** (`hero-light` style): `tools/importer/transformers/atlascopcogroup-hero-section.js`
  inserts `| style | hero-light |` + `<hr>` before the featured-cards grid, splitting the
  top-of-page hero (breadcrumb/eyebrow/H1/lede) into its own `rgb(243,246,247)` band; the
  cards start their own white section below. `scripts/scripts.js` → `decorateHeroIntro`
  tags the breadcrumb (`ol.breadcrumb`), eyebrow (`p.eyebrow`), and lede (`p.hero-lede`)
  as plain default content for CSS.
- **Header-model offset (source vs ours):** the source header is `position:absolute`
  (reserves 0px), ours is a fixed bar reserving 96px (`body>header{height:96px}`). So to
  match a source y-position, subtract ~96px of top padding. Match the *visible* result
  (breadcrumb at y≈128), not the source's raw band height — don't pad empty space to hit
  a pixel total.

### section-metadata dataset gotcha
`section-metadata.js` stores non-`style` keys as `data-*`. `dataset['tab-group'] = v`
THROWS (DOMStringMap rejects hyphenated property names) — must convert kebab→camelCase
(`dataset.tabGroup`). Applies to any hyphenated metadata key.

## Breadcrumb — DERIVED, never authored
Breadcrumbs reflect where a page sits, so they must not be authored into the document.
- **Import strips it:** `tools/importer/transformers/atlascopcogroup-breadcrumb.js` (general,
  wired into every template, invoked right after `createMetadata`) removes the source
  `.cmp-breadcrumb` / `.breadcrumb.cmp-breadcrumb--bar` subtree and writes the ancestor
  trail into a `breadcrumb` page-metadata row.
- **Metadata format:** `path::label|path::label`, ANCESTORS ONLY. The current page's own
  crumb is NOT stored — `scripts/scripts.js` → `decorateHeroIntro`/`buildBreadcrumb`
  appends it at render time from the page title (plain text, `aria-current="page"`), so a
  moved page re-derives its trail correctly on the next import.
- **Labels come from the source's breadcrumb component**, NOT from URL-slug title-casing
  (mangles proper nouns → "Atlas Copco Ab Share", and can't map `/en`→"Home") and NOT from
  nav-menu text (a language link shares the `/en` href and yields "English"). The
  `.cmp-breadcrumb__item` list is itself URL-derived and authoritative.
- **No ancestors → render nothing** (e.g. `/en`), not an empty bar. `buildBreadcrumb`
  returns null when the metadata key is absent/empty.
- **Determinism rule (general):** any parser-written metadata MUST be URL-derived and
  byte-identical across repeat imports — verify with two runs + `sha256sum`.
- Styling: ancestor links 16px `rgb(16,114,185)`; current crumb 14px `rgb(62,63,65)`; ">"
  `::after` on all but the last; row 24px at hero y≈128.
- **Re-publish caveat:** already-published pages keep their authored breadcrumb until
  re-imported + re-published. Audited this session — the ONLY imported content pages are
  `en` (homepage, no source breadcrumb), `nav`/`footer` (fragments), and
  `en/investors/reports-and-presentations` (already stripped + republished). So nothing
  else needs re-publishing today; re-check when importing a new deep page.

## Section-based tabs (Overview of documents on reports-and-presentations)
Any run of adjacent sections whose Section Metadata carries `| tab | <label> |` (+ optional
`| tab-group | <id> |`, `| tab-intro | true |`, `| tab-style | dark |`) is grouped into ONE
tabbed widget. Files:
- `scripts/section-tabs.js` — grouping + a11y keyboard nav (runs EAGERLY, see below).
- `styles/styles.css` — `.section-tabs*` styles live in the **EAGER** stylesheet, NOT
  lazy-styles.css (the widget is built pre-paint; lazy CSS would flash stacked-inline).
  Folder-tab chrome: grey `rgb(227,229,233)` tablist strip, white active "folder" tab.
- `tools/importer/transformers/atlascopcogroup-reports-tabs.js` — flattens source
  `.cmp-tabs` into per-year `| tab |` sections. Each year's quarters become one **accordion
  block** (see below), and the "Overview of documents" intro heading + tab band are
  `tab-style: dark` (full-width teal band; PANELS stay white cards).

### DEPLOY BUG — section-tabs.js must read `section.dataset` FIRST, DOM table as fallback
(The single worst regression this project hit; do not undo.) `readSectionMetadata` reads
BOTH: `section.dataset.tab/.tabGroup/.tabIntro/.tabStyle` first, then falls back to the raw
`.section-metadata` table. Why: on **deployed EDS** the section-metadata block has ALWAYS
run by the time the eager grouper executes — it has promoted the keys to `data-*` and
REMOVED the table from the DOM. A DOM-table-only read finds nothing there, matches zero
sections, and builds NO widget (all years render stacked, full height) — with no console
error. Local dev happened to run the grouper before the block, so the DOM read worked
there and it passed locally while being broken live. Reading dataset-with-DOM-fallback is
order-independent and works in both. Verify on the LIVE aem.page URL, not just local.

### HARNESS LESSON — DOM-restructuring autoblocking runs EAGERLY, never in loadLazy
`buildAutoBlocks`, `buildSectionTabs`, `decorateHeroIntro` all run inside `decorateMain()`
after `decorateSections(main)` and before `decorateBlocks(main)`. In `loadLazy` it's too
late: `decorateSections` reveals sections (`body.appear`) before the lazy phase, so
restructured content flashes/stays stacked inline (and if a section load stalls — e.g.
source Scene7 doc-thumbnails 403 and hang `loadSection` — may never regroup). Hide inactive
panels with the `hidden` ATTRIBUTE (+ CSS `.section-tabs-panel[hidden]{display:none}`), not
inline `style.display` — `loadSection` sets `section.style.display=null` on load, clobbering
inline display but leaving the `hidden` attribute intact.

## accordion block (`blocks/accordion/`) — reports quarters
Each tab panel hosts one accordion (one item per quarter). The reports-tabs transformer
emits rows shaped `[ label | expanded-flag | published | left-col | right-col ]`:
- **Authored open state, NOT a heuristic:** the `expanded-flag` cell carries the source's
  real per-item state — the source marks specific quarters open via `data-cmp-expanded` /
  `.cmp-accordion__button--expanded` / `aria-expanded="true"` (currently exactly Q2 2026 +
  Q4 2025; every other year 0 open). accordion.js opens items whose flag says "expanded".
  Do NOT reintroduce a "first item open" rule — an earlier round did and it was wrong (a
  page-wide count of expanded panels was skewed by the 6 hidden tabs). section-tabs.js must
  NOT force-sync a single open item on load/switch; each tab keeps its own authored state.
- **2-column body:** content-driven split — the "Downloadable documents" group goes in the
  left cell, every OTHER group (Press release, Webcast, …) stacks in the right cell. Not
  positional: Annual Report items have no Webcast, and that must still render as 2 clean
  columns (or a single full-width column if there are genuinely no right-hand groups).
  accordion.css lays it out as a 2-col grid (24px gap), collapsing to 1 col below 900px.
- Header title 32px/44px teal; group h4 24px teal; internal DAM links teal no-underline,
  external links blue underlined; no list bullets. 36 items total, 34 with "Published on".

### Static `drafts/*.html` do NOT run the EDS pipeline in this setup
A raw `drafts/foo.html` served at `/drafts/foo.html` is returned as-is: no `scripts.js`,
no section decoration, no autoblocking (confirmed: `document.querySelector('script[src*=scripts.js]')`
is null, sections keep no `.section` class). To validate blocks/decoration you must go
through real content at `/content/<path>` (which the aem-up server decorates), not a draft
HTML file. Build the importer output and view `/content/...` instead.

## cards-feature is a SHARED block — scope any change so the homepage doesn't regress
`blocks/cards-feature/` renders both the homepage "Solutions…" teaser cards (H3/32px,
blue text-link CTA with arrow, no document list) AND the reports featured-document cards
(H2/40px, teal bullet-less document links, a padded blue button CTA). The two source
grids have different shapes, so ONE parser (`cards-feature-reports.js`) detects which:
`.ds-brand-teaser-card` → teaser branch; else document-card branch. In CSS, distinguish
the reports variant by the document link `<ul>` (`:has(ul)` / `li a`) so the homepage
cards keep their smaller sizing. Whenever you touch cards-feature CSS, re-verify the
homepage (`/en`) at 1308px: H3/32px, CTA `rgb(16,114,185)` inline-flex + arrow, 0 leaked
breadcrumb/eyebrow classes. Reports CTA vs doc links: the source CTA is a `.cmp-button`
(emit as a standalone `<p><a>`, gets the padded blue button); document links are
`.cmp-download` items (stay in the `<ul>`, teal, no arrow, no bullets).

## Import: bundle + eslint + templates
- Two per-template importers exist: `import-homepage.js` and
  `import-reports-and-presentations.js`, each with its own `.bundle.js` + `urls-*.txt`.
- Generated `*.bundle.js` files are in `.eslintignore` (esbuild IIFE output isn't
  lint-clean). Rebuild the bundle after editing ANY parser/transformer, point
  run-bulk-import at the `.bundle.js`, and `npm run lint` before committing (both JS +
  CSS; stylelint enforces `no-descending-specificity` — guard deliberate cascade
  overrides with `/* stylelint-disable-next-line no-descending-specificity */`).
- reports-and-presentations import completeness reports ~54% — expected, because most of
  the page's content now lives in blocks (accordion/tabs/cards); the score measures loose
  text survival, not correctness.

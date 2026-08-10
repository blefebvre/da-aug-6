see @AGENTS.md

# Atlas Copco Group migration — agent notes (learnings & gotchas)

This project migrates https://www.atlascopcogroup.com/en to AEM Edge Delivery /
Document Authoring (DA). The notes below are hard-won; read them before touching
images, content, the header/footer, or the import pipeline.

## Deployment / serving model (two separate tracks)
- **Code** (`blocks/`, `styles/`, `scripts/`) ships via **git push → AEM Code Sync**.
- **Content** (`content/**`, incl. `nav`, `footer`, page docs) is **gitignored** and
  ships by **uploading/publishing to Document Authoring** (admin.da.live). Re-running
  the importer only regenerates the *local* `content/*.plain.html`; it does NOT publish.
  The user publishes content themselves.
- Root paths (`/nav`, `/footer`, `/en`) are served by the DA backend on BOTH local
  (`aem up` proxies them) and the aem.page preview. The `/content/*` prefix serves the
  LOCAL working copy (dev only; `/content/*` 404s on preview).
- **Boilerplate leak gotcha:** until migrated content is published to DA, the backend
  serves Adobe's DEFAULT boilerplate `/footer` (and would for `/nav`). So header.js /
  footer.js fetch **`/content/<name>` FIRST**, then fall back to the root path — otherwise
  they silently pick up boilerplate. Do not reorder those fetches.
- Deploy opt-ins live in **Settings → LLM Permissions** (git creds; and Adobe IMS/DA
  creds for admin.hlx.page + DA uploads). Never accept a pasted token; if a push or DA
  upload 401s, ask the user to enable the toggle. Credentials are injected automatically.

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
  dark teal `#04424D`, sand `#E1B77E`, pale gold `#FCF8F2`.
- Section-title default-content H2s that introduce a cards block are **40px/56px**
  (press releases 40/48) — see the scoped rule in `styles.css`. Card H3s are 32/44,
  press-card H3s 24/31.92 w600, cards-nav H2/H3 32/48, hero H1 56/63.84.
- Section styles: `.dark` teal, `.extra-dark` dark-teal, `.bg-gold` pale-gold; `filled-gold`
  keeps the SECTION transparent — the gold box lives on the block's inner content.
- cards-nav strip overlaps the hero by -60px (desktop) — the source's signature pull-up.

## Verification gotcha (measuring the preview)
The preview iframe defaults to a narrow width (~708px) = the mobile branch. **Assert
`window.innerWidth >= 900` (or >=1300 for the user's 1308 comparisons) inside the iframe
before trusting desktop measurements**, and sample computed styles after ~1s for any
transition. Prefer `browser_evaluate` returning compact JSON over screenshots (token cost).

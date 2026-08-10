import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
} from './aem.js';
import buildSectionTabs from './section-tabs.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

// --- BEGIN DM/Scene7 auto-block (excat-generated) ---

const DM_BREAKPOINTS = [
  { media: '(min-width: 600px)', width: 2000 }, // desktop
  { width: 750 }, // mobile / fallback (no media)
];

// Width candidates for a real responsive srcset. The browser picks the
// smallest rendition that covers the slot at the device pixel ratio, so a
// half-width band gets ~750–1000px and a full-bleed hero gets ~1600–2000px
// off the same markup — no more pinning every image to 750 (blurry) or 2000
// (wasteful). Emitted as `w` descriptors paired with a `sizes` hint.
const DM_SRCSET_WIDTHS = [640, 750, 1000, 1280, 1600, 2000, 2500];

// Default slot hint. Most DM images here are full-bleed (hero, sustainability)
// or occupy a full content column on mobile; blocks that render a narrower
// slot (columns-media, cards, carousel) pass a tighter `sizes` via the
// data-dm-sizes attribute, read in renderScene7Picture below.
const DM_DEFAULT_SIZES = '100vw';

// ---- Canonical helpers (keep in sync with dm-scene7-helpers.js) ----
function detectDynamicMediaUrl(urlStr) {
  // Reject relative URLs up front — without this guard, the auto-block
  // scans every anchor in <main> and a normal site link like
  // `<a href="/is/image/foo">` would be classified as DM and replaced by
  // a <picture>. Keep byte-identical with dm-scene7-helpers.js.
  if (!/^(https?:\/\/|\/\/)/i.test(urlStr)) return false;
  let u;
  try { u = new URL(urlStr, 'https://x/'); } catch { return false; }
  // Scene7 detected by path alone — hostname is irrelevant because
  // customer sites routinely CNAME a vanity domain to Scene7 (e.g.
  // media-assets.brand.example).
  if (u.pathname.startsWith('/is/image/')) {
    return 'scene7';
  }
  if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname)
      && u.pathname.startsWith('/adobe/assets/urn:')) {
    return 'dm-openapi';
  }
  return false;
}

function buildScene7Rendition(src, { width, format }) {
  // Manipulate the query string verbatim — URL.searchParams percent-
  // encodes `$`, but Scene7's IS/Image template-parameter syntax
  // (`$image=`, `$badge=`, etc.) requires the literal `$`. Encoded
  // form is silently dropped by Scene7's parser, returning the bare
  // template image instead of the personalized composite.
  const normalized = src.startsWith('//') ? `https:${src}` : src;
  const qIdx = normalized.indexOf('?');
  const base = qIdx >= 0 ? normalized.slice(0, qIdx) : normalized;
  const query = qIdx >= 0 ? normalized.slice(qIdx + 1) : '';
  const pairs = query.split('&').filter((p) => p);
  const filtered = pairs.filter((p) => {
    const k = p.split('=')[0];
    return k !== 'wid' && k !== 'fmt';
  });
  filtered.push(`wid=${width}`);
  filtered.push(`fmt=${format}`);
  return `${base}?${filtered.join('&')}`;
}

function buildDmOpenApiRendition(src, { width }) {
  // Synthetic base — see buildScene7Rendition above.
  const url = new URL(src, 'https://x/');
  url.searchParams.set('width', String(width));
  return url.toString();
}

function findDmOnAnchor(a) {
  if (!a || typeof a.getAttribute !== 'function') return null;
  const href = a.getAttribute('href') || '';
  if (detectDynamicMediaUrl(href)) return { mode: 'unlinked', dmUrl: href };
  const title = a.getAttribute('title') || '';
  if (detectDynamicMediaUrl(title)) return { mode: 'linked', dmUrl: title };
  return null;
}

// True when the given anchor is the sole child of a markdown-generated
// <p> wrapper that should be unwrapped so the picture becomes a top-
// level grid cell. P only — NEVER DIV: EDS block content uses <div>
// cells (cards/carousel/columns decorators detect image cells via
// `div.querySelector('picture')`); unwrapping a <div> collapses the
// block's row structure and stops images rendering inside blocks.
// Text-node guard: <p>caption <a href="DM">alt</a></p> must NOT be
// treated as unwrappable — replacing the parent would delete "caption".
// Comparing trimmed textContent of <p> against the anchor's catches this.
function isUnwrappableMarkdownParagraph(anchor) {
  const parent = anchor && anchor.parentElement;
  if (!parent || parent.tagName !== 'P') return false;
  if (parent.children.length !== 1 || parent.firstElementChild !== anchor) return false;
  return parent.textContent.trim() === anchor.textContent.trim();
}

// Sentinel used by the transformer when source <img> alt is empty. Document
// view shows the visible cue; we translate it back to alt="" here so screen
// readers correctly skip decorative images. If an author edits the link
// text away from the sentinel, their edit becomes the real alt — a11y
// improves. Must stay byte-identical to dm-scene7-helpers.js EMPTY_ALT_SENTINEL.
const EMPTY_ALT_SENTINEL = 'Image without alt text';

function linkTextToAlt(linkText) {
  return linkText === EMPTY_ALT_SENTINEL ? '' : linkText;
}

// ---- Rendering ----
function appendSource(picture, {
  type, srcset, media, sizes,
}) {
  const source = document.createElement('source');
  if (type) source.type = type;
  source.srcset = srcset;
  if (media) source.setAttribute('media', media);
  if (sizes) source.setAttribute('sizes', sizes);
  picture.append(source);
}

// Build a width-descriptor srcset ("url 640w, url 750w, ...") so the browser
// fetches a rendition sized to the actual slot rather than a fixed width.
function buildScene7Srcset(src, format) {
  return DM_SRCSET_WIDTHS
    .map((w) => `${buildScene7Rendition(src, { width: w, format })} ${w}w`)
    .join(', ');
}

function renderScene7Picture(src, alt, options = {}) {
  const sizes = options.sizes || DM_DEFAULT_SIZES;
  const picture = document.createElement('picture');
  // One <source> per format carrying the full width-descriptor srcset + sizes.
  // The browser resolves the best candidate for the slot; no per-breakpoint
  // media queries needed (sizes does that job and adapts to any layout).
  appendSource(picture, {
    type: 'image/webp',
    srcset: buildScene7Srcset(src, 'webp'),
    sizes,
  });
  appendSource(picture, {
    type: 'image/jpeg',
    srcset: buildScene7Srcset(src, 'jpg'),
    sizes,
  });
  const img = document.createElement('img');
  // Fallback src is a mid-range rendition (not the smallest) so browsers that
  // ignore <source> still get something reasonably sharp.
  img.src = buildScene7Rendition(src, { width: 1280, format: 'jpg' });
  img.srcset = buildScene7Srcset(src, 'jpg');
  img.sizes = sizes;
  img.alt = alt;
  img.loading = options.eager ? 'eager' : 'lazy';
  picture.append(img);
  return picture;
}

function renderDmOpenApiPicture(src, alt) {
  const picture = document.createElement('picture');
  DM_BREAKPOINTS.forEach((bp) => appendSource(picture, {
    srcset: buildDmOpenApiRendition(src, { width: bp.width }),
    media: bp.media,
  }));
  const img = document.createElement('img');
  img.src = buildDmOpenApiRendition(src, { width: 750 });
  img.alt = alt;
  img.loading = 'lazy';
  picture.append(img);
  return picture;
}

function buildDynamicMediaImages(main) {
  // Anchors carrying DM URLs from the markdown round-trip. The transformer
  // turns <img DM> into <a href=DM-URL> (or <a href=/page title=DM-URL>
  // for the linked case); CommonMark's [text](url "title") syntax
  // survives docx and the title attribute round-trips back to a real
  // HTML attribute at render time.
  const dmAnchors = [...main.querySelectorAll('a')].filter((a) => findDmOnAnchor(a));
  dmAnchors.forEach((a, index) => {
    const match = findDmOnAnchor(a);
    if (!match) return;

    const { mode, dmUrl } = match;
    // Translate link text back to alt: sentinel ('Image without alt text')
    // means the source had alt="" — render with alt="" for a11y. Any other
    // text (including the author's edit of the placeholder) is real alt.
    const alt = linkTextToAlt(a.textContent.trim());
    // Per-slot responsive hint: full-bleed images (hero / .filled-gold banner)
    // fill the viewport; columns-media occupies ~half a 1380px column; cards &
    // carousel occupy ~a third. Getting `sizes` roughly right lets the browser
    // pick a sharp-but-not-wasteful rendition per slot.
    const inBlock = (name) => a.closest(`.${name}`) !== null;
    let sizes = DM_DEFAULT_SIZES;
    if (inBlock('columns-media')) sizes = '(min-width: 900px) 690px, 100vw';
    else if (inBlock('cards-feature') || inBlock('cards-nav')) sizes = '(min-width: 900px) 460px, (min-width: 600px) 50vw, 100vw';
    else if (inBlock('carousel-stories')) sizes = '(min-width: 900px) 440px, (min-width: 600px) 50vw, 85vw';
    // Eager-load the first DM image (the hero, above the fold) to help LCP;
    // everything else stays lazy.
    const eager = index === 0;
    const picture = detectDynamicMediaUrl(dmUrl) === 'scene7'
      ? renderScene7Picture(dmUrl, alt, { sizes, eager })
      : renderDmOpenApiPicture(dmUrl, alt);

    // decorateMain() calls decorateButtons() BEFORE buildAutoBlocks(). At
    // that point every DM anchor (linked or unlinked) looks like a plain
    // text link — no <img> yet — so decorateButtons promotes it to a button
    // and adds `button-container` to its sole-child <p>/<div> parent. The
    // unwanted border around the rebuilt <picture> is the visible symptom;
    // for unlinked-in-<div> the leftover `button-container` on a block-cell
    // <div> can also confuse block decorators that filter on classList.
    // Strip both classes BEFORE rebuilding so the cleanup covers every
    // branch below (replaceChildren / replaceWith / parent-replaceWith).
    // Idempotent — no-op when the classes aren't present.
    a.classList.remove('button', 'primary', 'secondary');
    if (a.classList.length === 0) a.removeAttribute('class');
    const buttonContainer = a.parentElement;
    if (
      buttonContainer
      && buttonContainer.classList.contains('button-container')
      && buttonContainer.children.length === 1
    ) {
      buttonContainer.classList.remove('button-container');
      if (buttonContainer.classList.length === 0) buttonContainer.removeAttribute('class');
    }

    if (mode === 'linked') {
      // Keep the outer <a> and its navigation href. Drop the DM URL from title
      // (it's been consumed) and replace the anchor's content with the picture.
      a.removeAttribute('title');
      a.replaceChildren(picture);
      return;
    }

    // Unlinked: the whole anchor is just a carrier for the DM URL.
    // If it's the markdown-generated <p> wrapper around a standalone
    // image, unwrap so the picture becomes a top-level grid cell.
    // NEVER unwrap <div> — those are block-content cells (cards,
    // carousel, columns); unwrapping them collapses the block's row
    // structure and decorators can't find their image cells.
    if (isUnwrappableMarkdownParagraph(a)) {
      a.parentElement.replaceWith(picture);
    } else {
      a.replaceWith(picture);
    }
  });
}

// Register the DM dispatcher for createOptimizedPicture interop.
// The aem.js patch (applied per skills/excat-site-migration/SKILL.md
// Step 5b) checks for this hook and delegates DM URLs to our renderer,
// so block decorators that call createOptimizedPicture(img.src, ...) on
// Scene7 IS/Image template URLs or DM Open API URLs preserve their
// query parameters instead of having them stripped by the path-only
// optimizer in aem.js. No-op when the auto-block is not installed
// (hook unregistered → aem.js falls through to standard logic).
//
// Returning null for non-DM URLs lets the caller (createOptimizedPicture)
// fall through to its standard path-only optimization. This is the
// regression guard for non-DM images on the same page.
window.__dmRender__ = (src, alt) => {
  const family = detectDynamicMediaUrl(src);
  if (!family) return null;
  return family === 'scene7'
    ? renderScene7Picture(src, alt)
    : renderDmOpenApiPicture(src, alt);
};

// --- END DM/Scene7 auto-block ---

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
    buildDynamicMediaImages(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
/**
 * Tag the top-of-page breadcrumb trail and section eyebrow so global CSS can
 * style them. Both are plain default content (no block): the breadcrumb is an
 * <ol> of ancestor links; the eyebrow is the short <p> that introduces the H1.
 * Scoped to the FIRST section's default-content-wrapper, so it never touches
 * block content (e.g. the homepage hero auto-block) and is a no-op on pages
 * that don't have this top-of-page pattern.
 * @param {Element} main
 */
function decorateBreadcrumbAndEyebrow(main) {
  const dc = main.querySelector(':scope > .section > .default-content-wrapper');
  if (!dc) return;

  // Breadcrumb: a leading <ol> whose items are ancestor links (the last crumb,
  // the current page, is plain text). Require ≥2 items, all-but-last linked.
  const ol = dc.querySelector(':scope > ol');
  if (ol) {
    const items = [...ol.children];
    const linked = items.filter((li) => li.querySelector(':scope > a'));
    if (items.length >= 2 && linked.length >= items.length - 1) {
      ol.classList.add('breadcrumb');
    }
  }

  // Eyebrow: the short <p> immediately preceding the page <h1>.
  const h1 = dc.querySelector(':scope > h1');
  const prev = h1 && h1.previousElementSibling;
  if (prev && prev.tagName === 'P' && prev.textContent.trim()) {
    prev.classList.add('eyebrow');
  }
}

// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  // Group runs of tab-flagged sections into tabbed widgets BEFORE paint, so tab
  // sections never flash stacked inline. Reads `| tab | … |` section metadata
  // directly; a no-op on pages without it. Runs after decorateSections (so the
  // `.section` wrappers exist) and before decorateBlocks (so blocks inside the
  // moved panel sections still decorate normally).
  buildSectionTabs(main);
  decorateBreadcrumbAndEyebrow(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Atlas Copco Group Dynamic Media / Scene7 images.
 *
 * The source (https://www.atlascopcogroup.com/en) serves images from Scene7
 * IS/Image URLs (atlascopco.scene7.com/is/image/atlascopco/...?$landscape1280$).
 * 24 such URLs are preserved in migration-work/metadata.json .images.mapping.
 *
 * This transformer rewrites every DM/Scene7 <img> into an anchor so the URL
 * round-trips through markdown intact ([text](url "title") survives docx). A
 * companion auto-block in scripts/scripts.js (buildDynamicMediaImages, installed
 * by the site-migration orchestrator) rebuilds those anchors into responsive
 * <picture> elements at render time.
 *
 * Runs in afterTransform ONLY: block parsers run between beforeTransform and
 * afterTransform and extract <img> references into block cells (cards/carousel/
 * columns). Rewriting imgs to anchors before parsers run would leave empty cells.
 *
 * The inlined helpers (detectDynamicMediaUrl, findLinkedDmCarrier,
 * EMPTY_ALT_SENTINEL, altToLinkText) are byte-identical to the canonical
 * dm-scene7-helpers.js and to the copies inlined in the scripts.js auto-block.
 */

// ---- Begin canonical helpers (copy from dm-scene7-helpers.js) ----
function detectDynamicMediaUrl(urlStr) {
  let u;
  try { u = new URL(urlStr, 'https://x/'); } catch { return false; }
  // Scene7 detected by path alone — hostname is irrelevant because
  // customer sites routinely CNAME a vanity domain to Scene7 (e.g.
  // media-assets.brand.example). Keep byte-identical with dm-scene7-helpers.js.
  if (u.pathname.startsWith('/is/image/')) {
    return 'scene7';
  }
  if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname)
      && u.pathname.startsWith('/adobe/assets/urn:')) {
    return 'dm-openapi';
  }
  return false;
}

// Walk up from a DM <img> through allow-listed inline wrappers (currently
// just <picture>) to find the carrier anchor for the linked-image
// round-trip. Returns the outer <a> when the img is the sole meaningful
// descendant; null otherwise. Without the walk, parsers that pre-wrap
// the img in <picture> — e.g. cards-portfolio on 2026-05-13 producing
// <a href="/page"><picture><img src=DM></picture></a> — slip past the
// linked branch and end up nested-anchored, splitting into two siblings
// in markdown. Keep byte-identical with dm-scene7-helpers.js.
const LINKED_DM_INLINE_WRAPPER_TAGS = new Set(['PICTURE']);
const LINKED_DM_WRAPPER_SIBLING_TAGS = new Set(['SOURCE']); // standard <picture> siblings
function findLinkedDmCarrier(img) {
  if (!img || !img.parentElement) return null;
  let node = img;
  let parent = img.parentElement;
  while (parent && LINKED_DM_INLINE_WRAPPER_TAGS.has(parent.tagName)) {
    let foundNode = false;
    for (const child of parent.children) {
      if (child === node) {
        foundNode = true;
      } else if (!LINKED_DM_WRAPPER_SIBLING_TAGS.has(child.tagName)) {
        return null;
      }
    }
    if (!foundNode) return null;
    node = parent;
    parent = parent.parentElement;
  }
  if (!parent || parent.tagName !== 'A') return null;
  if (parent.children.length !== 1 || parent.children[0] !== node) return null;
  if (parent.textContent.trim() !== '') return null;
  return parent;
}

const EMPTY_ALT_SENTINEL = 'Image without alt text';

function altToLinkText(alt) {
  return alt || EMPTY_ALT_SENTINEL;
}
// ---- End canonical helpers ----

// Force an absolute https:// URL. Scene7 serves protocol-relative src
// (`//atlascopco.scene7.com/...`); if that survives into the published doc,
// Document Authoring treats the leading `//host/path` as a same-origin path
// and strips the host, leaving `/is/image/...`. The render-time auto-block
// then rejects it (its detectDynamicMediaUrl guard requires an absolute or
// protocol-relative URL), so the <picture> is never built and NOTHING renders.
// Emitting an explicit https:// URL here keeps the host intact through publish.
function toAbsoluteHttps(url) {
  if (url.startsWith('//')) return `https:${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  // Root-relative DM path (e.g. already-stripped `/is/image/...`) — restore the
  // canonical Scene7 host so the URL is self-describing and publish-safe.
  if (url.startsWith('/is/image/')) return `https://atlascopco.scene7.com${url}`;
  return url;
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const doc = element.ownerDocument;

  element.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!detectDynamicMediaUrl(src)) return;

    // Preserve alt verbatim, including empty string for decorative images.
    // The auto-block uses the URL pattern (not the text) to find these
    // anchors, so the link text is purely a Document-view UX cue. When alt
    // is empty we substitute EMPTY_ALT_SENTINEL ('Image without alt text')
    // so authors editing the doc see a visible cell at the image's
    // position; the auto-block translates the sentinel back to alt="" via
    // linkTextToAlt() so screen readers correctly skip decorative images.
    const alt = img.getAttribute('alt') || '';
    const absSrc = toAbsoluteHttps(src);

    // Linked image (incl. parser-wrapped `<a><picture><img></picture></a>`).
    // Stash DM URL in title, keep outer href; setting textContent replaces
    // any wrapper descendants with the link text.
    const linkedAnchor = findLinkedDmCarrier(img);
    if (linkedAnchor) {
      linkedAnchor.setAttribute('title', absSrc);
      linkedAnchor.textContent = altToLinkText(alt);
      return;
    }

    // Inside an anchor but not a sole-meaningful-child shape — mixed
    // content. No clean single-anchor markdown representation; skip.
    const parent = img.parentElement;
    if (parent && parent.tagName === 'A') {
      // eslint-disable-next-line no-console
      console.warn('DM image inside mixed-content anchor, skipped:', src);
      return;
    }

    // Unlinked image: create an anchor whose href is the DM URL.
    const a = doc.createElement('a');
    a.setAttribute('href', absSrc);
    a.textContent = altToLinkText(alt);
    img.replaceWith(a);
  });
}

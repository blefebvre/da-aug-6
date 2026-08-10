/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: breadcrumb → deterministic page metadata (and strip the authored
 * breadcrumb markup).
 *
 * A breadcrumb is DERIVED from where a page sits, not authored per page, so it
 * must not live in the document. The source renders it as a `.cmp-breadcrumb`
 * (inside a `.breadcrumb.cmp-breadcrumb--bar` wrapper) whose list is itself
 * derived from the URL hierarchy:
 *   <li.cmp-breadcrumb__item><a href="/en"><span itemprop="name">Home</span></a>
 *   <li.cmp-breadcrumb__item><a href="/en/investors">…Investors…</a>
 *   <li.cmp-breadcrumb__item--active aria-current="page"><span>…current page…</span>
 * Ancestor items carry an <a href>; the current page is a bare span (no link).
 *
 * This transformer:
 *  1. Reads the ANCESTOR trail (items with an <a href>) as {path, label} pairs.
 *     path = the anchor href (= the cumulative URL path); label = the span text.
 *     Deterministic: same URL + same source page → same pairs, always.
 *  2. Writes them into the page Metadata block as a `breadcrumb` row, encoded
 *     `path::label|path::label` (no quotes/`<>&`, safe in a <meta> attribute).
 *     The CURRENT page's own label is intentionally NOT stored — the render-time
 *     auto-block appends it from the page title. A page with no ancestors
 *     (e.g. /en) writes no row, so the auto-block renders nothing.
 *  3. Removes the breadcrumb subtree so the authored document carries none.
 *
 * General, not page-specific: every Atlas Copco page carries this breadcrumb, so
 * this is wired into every template's import. Invoked EXPLICITLY right after
 * `WebImporter.rules.createMetadata(...)` (like the metadata-image transformer),
 * because it appends to the Metadata <table> that createMetadata builds — and the
 * source breadcrumb still exists in the document at that point (no block parser
 * consumes it).
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Encode ancestor pairs for a single metadata value. Separators chosen to never
// collide with URL paths or short breadcrumb labels, and to be safe inside an
// HTML attribute (no quotes/angles/ampersands).
function encodeTrail(pairs) {
  return pairs.map(({ path, label }) => `${path}::${label}`).join('|');
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const doc = element.ownerDocument;

  // 1. Read the ancestor trail from the source breadcrumb (ancestors = items
  //    that link somewhere; the active/current item is a bare span).
  const items = [...element.querySelectorAll('.cmp-breadcrumb__item')];
  const pairs = [];
  items.forEach((li) => {
    const a = li.querySelector('a[href]');
    if (!a) return; // active/current item — not an ancestor
    const path = a.getAttribute('href').trim();
    const label = (a.querySelector('[itemprop="name"]') || a).textContent.trim();
    if (path && label) pairs.push({ path, label });
  });

  // 2. Write the trail into the Metadata <table> (only when there are ancestors).
  if (pairs.length) {
    const tables = [...element.querySelectorAll('table')].filter((t) => {
      const first = t.querySelector('th, td');
      return first && first.textContent.trim().toLowerCase() === 'metadata';
    });
    tables.forEach((table) => {
      // Don't duplicate if a breadcrumb row somehow already exists.
      const has = [...table.querySelectorAll('tr')].some((r) => {
        const c = r.children[0];
        return c && c.textContent.trim().toLowerCase() === 'breadcrumb';
      });
      if (has) return;
      const tr = doc.createElement('tr');
      const keyTd = doc.createElement('td');
      keyTd.textContent = 'breadcrumb';
      const valTd = doc.createElement('td');
      valTd.textContent = encodeTrail(pairs);
      tr.append(keyTd, valTd);
      table.appendChild(tr);
    });
  }

  // 3. Strip the breadcrumb markup from the document (general — every page).
  WebImporter.DOMUtils.remove(element, [
    '.breadcrumb.cmp-breadcrumb--bar',
    '.cmp-breadcrumb',
  ]);
}

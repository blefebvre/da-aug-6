/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Atlas Copco "Overview of documents" tabs → section-based tabs.
 *
 * The source renders this section as a single `.cmp-tabs` widget: a year
 * tablist (2026…2020) where each tabpanel holds an accordion of report groups
 * (Q2 2026, Q1 2026, Capital Markets Day, Annual Report…), and each accordion
 * item holds document download links.
 *
 * Our target is "section-based tabs": each year becomes its OWN section, flagged
 * with a Section Metadata table `| tab | <year> |` (+ `| tab-group | overview |`).
 * The render-time helper scripts/section-tabs.js groups the adjacent tab-flagged
 * sections into a tabbed widget. So this transformer replaces the `.cmp-tabs`
 * DOM with a flat sequence of: <hr>, section content (group headings + document
 * link lists), <section-metadata table>, repeated per year.
 *
 * Runs in beforeTransform: it consumes the source `.cmp-tabs` before any block
 * parser touches it, and emits plain headings/lists/anchors the importer knows.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Build a Section Metadata table (same shape WebImporter.Blocks.createBlock makes)
// carrying the tab label + shared group id + a dark-style hint. section-tabs.js
// reads `tab-style: dark` and paints the whole widget as one dark band.
function buildTabMetadata(doc, label) {
  return WebImporter.Blocks.createBlock(doc, {
    name: 'Section Metadata',
    cells: { tab: label, 'tab-group': 'overview', 'tab-style': 'dark' },
  });
}

// Section Metadata for the widget's intro heading ("Overview of documents"):
// same group so it joins the run, `tab-intro` flags it as the heading (not a
// tab/panel), and the dark hint keeps it in the same dark band.
function buildIntroMetadata(doc) {
  return WebImporter.Blocks.createBlock(doc, {
    name: 'Section Metadata',
    cells: { 'tab-intro': 'true', 'tab-group': 'overview', 'tab-style': 'dark' },
  });
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  const doc = element.ownerDocument;
  const tabsRoot = element.querySelector('.cmp-tabs');
  if (!tabsRoot) return;

  const tablist = tabsRoot.querySelector('[role="tablist"]');
  const tabLabels = tablist
    ? [...tablist.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim())
    : [];
  const panels = [...tabsRoot.querySelectorAll('[role="tabpanel"]')];
  if (!panels.length) return;

  // Fragment holding the flattened tab sections, built in document order.
  const frag = doc.createDocumentFragment();

  // Intro heading section ("Overview of documents"). The source renders this
  // heading in the same dark band as the tabs. Find the nearest heading that
  // PRECEDES the tabs widget anywhere in the document and MOVE it (don't clone —
  // cloning leaves the original behind as a duplicate) into its own tab-group
  // section flagged tab-intro. A section break precedes it so the render-time
  // grouper starts a clean run.
  const allHeadings = [...element.querySelectorAll('h1, h2, h3')];
  const introHeading = allHeadings
    .filter((h) => (h.compareDocumentPosition(tabsRoot) & Node.DOCUMENT_POSITION_FOLLOWING))
    .pop() || null;

  frag.appendChild(doc.createElement('hr'));
  if (introHeading) {
    // Reuse the real heading node (moved into the fragment), so no copy is left
    // behind in the preceding section.
    const h2 = doc.createElement('h2');
    h2.textContent = introHeading.textContent.trim();
    frag.appendChild(h2);
    introHeading.remove();
  } else {
    const h2 = doc.createElement('h2');
    h2.textContent = 'Overview of documents';
    frag.appendChild(h2);
  }
  frag.appendChild(buildIntroMetadata(doc));

  panels.forEach((panel, i) => {
    const label = tabLabels[i] || `Tab ${i + 1}`;

    // Section break before every tab section (the tabs widget is one contiguous
    // run; the render-time grouper needs <hr> boundaries between panels).
    frag.appendChild(doc.createElement('hr'));

    // Each accordion item = one report group. Emit its title as an <h3> and its
    // documents as a <ul> of links. Fall back to raw panel content if the
    // accordion structure is absent.
    const items = [...panel.querySelectorAll('.cmp-accordion__item')];
    if (items.length) {
      items.forEach((item) => {
        const titleEl = item.querySelector('.cmp-accordion__title, [class*="title"], button, h3');
        const groupLabel = titleEl ? titleEl.textContent.trim() : '';
        if (groupLabel) {
          const h3 = doc.createElement('h3');
          h3.textContent = groupLabel;
          frag.appendChild(h3);
        }

        // Collect the document links in this group. `.cmp-download__title-link`
        // is the canonical doc link; also keep other real anchors (CEO comment,
        // webcast) that appear in the item body.
        const seen = new Set();
        const ul = doc.createElement('ul');
        item.querySelectorAll('a[href]').forEach((a) => {
          const href = a.getAttribute('href');
          const text = a.textContent.trim();
          if (!href || !text) return;
          const key = `${text}|${href}`;
          if (seen.has(key)) return;
          seen.add(key);
          const li = doc.createElement('li');
          const link = doc.createElement('a');
          link.setAttribute('href', href);
          link.textContent = text;
          li.appendChild(link);
          ul.appendChild(li);
        });
        if (ul.children.length) frag.appendChild(ul);
      });
    } else {
      // No accordion — move the panel's own children across.
      while (panel.firstChild) frag.appendChild(panel.firstChild);
    }

    // Section metadata that flags this section as a tab.
    frag.appendChild(buildTabMetadata(doc, label));
  });

  // Replace the whole tabs widget with the flattened tab sections.
  tabsRoot.replaceWith(frag);
}

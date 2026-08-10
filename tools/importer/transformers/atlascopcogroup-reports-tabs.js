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
 * sections into a tabbed widget.
 *
 * Inside each tab section the source nests an ACCORDION (one item per quarter),
 * and each accordion item body has a "Published on …" date plus up to three
 * grouped sub-sections (h4: "Downloadable documents", "Press release",
 * "Webcast"). We preserve that: each tab section emits an `accordion` block
 * whose rows are [ quarter-label | body ], where the body holds the date <p>
 * and, per group, an <h4> followed by that group's document <ul>. blocks/
 * accordion decorates the block into collapsible items (first item expanded).
 *
 * Runs in beforeTransform: it consumes the source `.cmp-tabs` before any block
 * parser touches it, and emits an accordion table + section metadata per year.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Parse one accordion item (one quarter) into { published, left, right } so the
// accordion block can lay the body out as the source's two columns:
//   - published: the "Published on …" date <p> (full-width above the grid), or null
//   - left:  the "Downloadable documents" group (h4 + its link <ul>)
//   - right: every OTHER group (Press release, Webcast, …), stacked
// The split is CONTENT-DRIVEN, not positional: the group whose heading matches
// "Downloadable" goes left, all others go right — so quarters that lack a
// Webcast (e.g. Annual Report items) or carry other group sets still lay out
// correctly. Link grouping follows source DOM order: each h4 owns the links that
// appear after it, up to the next h4.
function buildQuarterBody(doc, item) {
  // Published-on date: first paragraph starting with "Published on".
  let published = null;
  const dateEl = [...item.querySelectorAll('p, .cmp-text')]
    .find((p) => /^Published on/i.test(p.textContent.trim()));
  if (dateEl) {
    published = doc.createElement('p');
    published.textContent = dateEl.textContent.trim();
  }

  // Walk headings + links in document order, collecting each group as
  // { h4, ul }. Links without a preceding h4 (rare) fall into a leading group
  // with a null h4.
  const panelBody = item.querySelector('.cmp-accordion__panel') || item;
  const seen = new Set();
  const groups = [];
  let current = null;
  const startGroup = (h4) => { current = { h4, ul: doc.createElement('ul') }; groups.push(current); };

  panelBody.querySelectorAll('h4, a[href]').forEach((node) => {
    if (node.tagName === 'H4') {
      const h4 = doc.createElement('h4');
      h4.textContent = node.textContent.trim();
      startGroup(h4);
    } else {
      const href = node.getAttribute('href');
      const text = node.textContent.trim();
      if (!href || !text) return;
      const key = `${text}|${href}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (!current) startGroup(null);
      const li = doc.createElement('li');
      const a = doc.createElement('a');
      a.setAttribute('href', href);
      a.textContent = text;
      li.appendChild(a);
      current.ul.appendChild(li);
    }
  });

  // Split groups: "Downloadable …" → left column, everything else → right.
  const left = [];
  const right = [];
  groups.forEach((g) => {
    if (!g.ul.children.length && !g.h4) return; // drop empty unlabeled group
    const isDownloadable = g.h4 && /downloadable/i.test(g.h4.textContent);
    const target = isDownloadable ? left : right;
    if (g.h4) target.push(g.h4);
    if (g.ul.children.length) target.push(g.ul);
  });

  // Fallback: if nothing matched "Downloadable" (unexpected group naming), keep
  // the first group on the left so a column is never empty while the other has all.
  if (!left.length && right.length) {
    const firstH4Idx = right.findIndex((n) => n.tagName === 'H4');
    if (firstH4Idx === 0) {
      // move the first group (h4 + following ul) to the left
      left.push(right.shift());
      if (right[0] && right[0].tagName === 'UL') left.push(right.shift());
    }
  }

  return { published, left, right };
}

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

    // Each accordion item = one quarter. Emit an `accordion` block whose rows
    // are [ quarter-label | expanded-flag | published-date | left-column |
    // right-column ]:
    //   - expanded-flag carries the source's AUTHORED open state
    //     (data-cmp-expanded / button--expanded / aria-expanded) so the block
    //     reproduces it exactly — the source opens specific quarters (Q2 2026,
    //     Q4 2025), NOT a "first item" rule. Closed items get an empty flag cell.
    //   - published-date is the full-width "Published on …" line above the grid.
    //   - left-column / right-column are the two body columns (Downloadable
    //     group left; Press release + Webcast + any other group right). Splitting
    //     them into separate cells lets accordion.css lay them out as a 2-col grid.
    const items = [...panel.querySelectorAll('.cmp-accordion__item')];
    if (items.length) {
      const rows = [];
      items.forEach((item) => {
        const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__button, [class*="title"], h3');
        const quarterLabel = titleEl ? titleEl.textContent.trim() : '';
        if (!quarterLabel) return;
        const btn = item.querySelector('.cmp-accordion__button');
        const expanded = item.hasAttribute('data-cmp-expanded')
          || !!item.querySelector('.cmp-accordion__button--expanded')
          || (btn && btn.getAttribute('aria-expanded') === 'true');
        const { published, left, right } = buildQuarterBody(doc, item);
        rows.push([
          quarterLabel,
          expanded ? 'expanded' : '',
          published ? [published] : [''],
          left.length ? left : [''],
          right.length ? right : [''],
        ]);
      });
      if (rows.length) {
        const accordion = WebImporter.Blocks.createBlock(doc, { name: 'accordion', cells: rows });
        frag.appendChild(accordion);
      }
    } else {
      // No accordion — move the panel's own children across.
      while (panel.firstChild) frag.appendChild(panel.firstChild);
    }

    // Section metadata that flags this section as a tab.
    frag.appendChild(buildTabMetadata(doc, label));
  });

  // Trailing section break so whatever FOLLOWS the tabs (e.g. "You might also
  // be interested in") starts its own, non-tab section — otherwise it would be
  // absorbed into the last tab panel (2020).
  frag.appendChild(doc.createElement('hr'));

  // Replace the whole tabs widget with the flattened tab sections.
  tabsRoot.replaceWith(frag);
}

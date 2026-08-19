/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Atlas Copco careers "Frequently asked questions" tabs.
 *
 * The source renders this as a single `.cmp-tabs` widget: a 3-tab tablist
 * ("Jobs and recruitment" / "Culture and values" / "Students") where each
 * tabpanel holds an accordion of FAQ items. Each accordion item is one question
 * (`<h2 class="cmp-accordion__header">`) whose panel is a single prose block
 * with inline links — NO grouped h4 subsections, NO "Published on" date, NO
 * document columns (unlike reports-and-presentations).
 *
 * Target: "section-based tabs" (see scripts/section-tabs.js). Each tab becomes
 * its own section flagged `| tab | <label> |` + `| tab-group | faq |` +
 * `| tab-style | light |` (full-bleed LIGHT grey band — NOT the reports dark
 * teal band). Inside each tab section we emit ONE `accordion (large)` block
 * (large = <h2>/40px headers) whose rows are the simple 3-cell shape
 * `[ question | expanded-flag | body ]`:
 *   - expanded-flag carries the source's authored open state
 *     (data-cmp-expanded / button--expanded / aria-expanded). On this page NONE
 *     are expanded, so every flag is empty and all items load collapsed.
 *   - body is the item's prose (paragraphs + inline links), single column.
 *
 * Runs in beforeTransform: consumes the source `.cmp-tabs` before any block
 * parser touches it.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Build the single-column body for one FAQ item: the paragraphs of the
// accordion panel, with inline links preserved. Deduped by text+href isn't
// needed here (no repeated download lists) — just carry the prose across.
function buildFaqBody(doc, item) {
  const panel = item.querySelector('.cmp-accordion__panel') || item;
  const parts = [];
  // Prefer explicit paragraphs; fall back to the whole text container.
  const paras = [...panel.querySelectorAll('.cmp-text p, p')];
  const seen = new Set();
  paras.forEach((p) => {
    const text = p.textContent.trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    // Clone so authored inline <a> links survive; strip attributes other than href.
    const out = doc.createElement('p');
    p.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        out.appendChild(doc.createTextNode(node.textContent));
      } else if (node.tagName === 'A') {
        const href = node.getAttribute('href');
        const a = doc.createElement('a');
        if (href) a.setAttribute('href', href);
        a.textContent = node.textContent;
        out.appendChild(a);
      } else {
        out.appendChild(doc.createTextNode(node.textContent));
      }
    });
    parts.push(out);
  });
  // Fallback: no <p> found — carry the raw text.
  if (!parts.length && panel.textContent.trim()) {
    const p = doc.createElement('p');
    p.textContent = panel.textContent.trim();
    parts.push(p);
  }
  return parts;
}

// Section Metadata carrying the tab label + shared group + light-style hint.
function buildTabMetadata(doc, label) {
  return WebImporter.Blocks.createBlock(doc, {
    name: 'Section Metadata',
    cells: { tab: label, 'tab-group': 'faq', 'tab-style': 'light' },
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

  const frag = doc.createDocumentFragment();

  panels.forEach((panel, i) => {
    const label = tabLabels[i] || `Tab ${i + 1}`;

    // Section break before every tab section (the render-time grouper needs
    // <hr> boundaries between adjacent panels).
    frag.appendChild(doc.createElement('hr'));

    // Each accordion item = one FAQ question. Emit an `accordion (large)` block
    // whose rows are [ question | expanded-flag | body ].
    const items = [...panel.querySelectorAll('.cmp-accordion__item')];
    if (items.length) {
      const rows = [];
      items.forEach((item) => {
        const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__button, [class*="title"], h2, h3');
        const question = titleEl ? titleEl.textContent.trim() : '';
        if (!question) return;
        const btn = item.querySelector('.cmp-accordion__button');
        const expanded = item.hasAttribute('data-cmp-expanded')
          || !!item.querySelector('.cmp-accordion__button--expanded')
          || (btn && btn.getAttribute('aria-expanded') === 'true');
        const body = buildFaqBody(doc, item);
        rows.push([question, expanded ? 'expanded' : '', body]);
      });
      if (rows.length) {
        const accordion = WebImporter.Blocks.createBlock(doc, { name: 'accordion (large)', cells: rows });
        frag.appendChild(accordion);
      }
    } else {
      while (panel.firstChild) frag.appendChild(panel.firstChild);
    }

    frag.appendChild(buildTabMetadata(doc, label));
  });

  // Trailing section break so whatever follows starts its own non-tab section.
  frag.appendChild(doc.createElement('hr'));

  tabsRoot.replaceWith(frag);
}

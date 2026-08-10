/*
 * Accordion block.
 *
 * Authored as a table whose rows are [ label | expanded-flag | body ]:
 *   - cell 0: the header label (quarter title)
 *   - cell 1: the expanded flag — text "expanded" opens the item on load,
 *     empty leaves it collapsed. This carries the SOURCE's authored open state
 *     (the source expands specific quarters, e.g. Q2 2026 and Q4 2025 — it is
 *     NOT a "first item" rule), so the block reproduces it exactly.
 *   - last cell: the collapsible body.
 * Legacy 2-column rows ([ label | body ]) are still accepted; without a flag
 * cell nothing auto-opens.
 *
 * Rendered with native <details>/<summary> so it's accessible and
 * keyboard-operable with no extra JS state. Each item keeps its own open state;
 * inside section-based tabs, a hidden panel's open items simply stay open and
 * become visible when that tab is selected (matching the source, where every
 * tab carries its own authored expansion).
 *
 * Used by the reports-and-presentations "Overview of documents" tabs: each tab
 * panel hosts one accordion, one item per quarter; each body holds the
 * "Published on …" date and the h4-grouped document link lists.
 *
 * @param {Element} block the accordion block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const label = cells[0];
    // 3-cell shape: [label | flag | body]. 2-cell legacy: [label | body].
    const hasFlagCell = cells.length >= 3;
    const flag = hasFlagCell ? cells[1] : null;
    const body = cells[cells.length - 1];
    const expanded = !!flag && /^expanded$/i.test(flag.textContent.trim());

    const details = document.createElement('details');
    details.className = 'accordion-item';
    if (expanded) details.open = true; // honour the source's authored open state

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    // Preserve any heading inside the label cell as plain text.
    summary.textContent = (label ? label.textContent : '').trim();

    const content = document.createElement('div');
    content.className = 'accordion-item-body';
    if (body && body !== label) {
      while (body.firstChild) content.append(body.firstChild);
    }

    details.append(summary, content);
    row.replaceWith(details);
  });
}

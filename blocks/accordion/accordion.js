/*
 * Accordion block.
 *
 * Authored as a 2-column table: each row is [ summary | details ]. The first
 * cell is the header label; the second cell is the collapsible body. Rendered
 * with native <details>/<summary> so it's accessible and keyboard-operable with
 * no extra JS state. The first item is open by default (matches the source,
 * where the first quarter of the active tab is expanded) — EXCEPT when this
 * accordion lives inside a hidden tab panel (section-based tabs), where nothing
 * should be expanded until that tab is selected. section-tabs.js re-syncs the
 * open item when a tab is activated, so overall exactly one item is expanded.
 *
 * Used by the reports-and-presentations "Overview of documents" tabs: each tab
 * panel hosts one accordion, one item per quarter; each body holds the
 * "Published on …" date and the h4-grouped document link lists.
 *
 * @param {Element} block the accordion block element
 */
export default function decorate(block) {
  // Don't auto-open the first item when this accordion is inside a hidden tab
  // panel — otherwise every tab's first item counts as expanded. section-tabs.js
  // opens the first item of the active panel (and re-syncs on tab switch).
  const inHiddenPanel = !!block.closest('.section-tabs-panel[hidden]');

  [...block.children].forEach((row, i) => {
    const cells = [...row.children];
    const label = cells[0];
    const body = cells[1];

    const details = document.createElement('details');
    details.className = 'accordion-item';
    if (i === 0 && !inHiddenPanel) details.open = true; // first item expanded

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    // Preserve any heading inside the label cell as plain text.
    summary.textContent = (label ? label.textContent : '').trim();

    const content = document.createElement('div');
    content.className = 'accordion-item-body';
    if (body) {
      while (body.firstChild) content.append(body.firstChild);
    }

    details.append(summary, content);
    row.replaceWith(details);
  });
}

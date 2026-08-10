/*
 * Accordion block.
 *
 * Authored as a table whose rows are
 *   [ label | expanded-flag | published | left-column | right-column ]:
 *   - cell 0: the header label (quarter title).
 *   - cell 1: the expanded flag — text "expanded" opens the item on load, empty
 *     leaves it collapsed. This carries the SOURCE's authored open state (the
 *     source expands specific quarters, e.g. Q2 2026 and Q4 2025 — NOT a "first
 *     item" rule), so the block reproduces it exactly.
 *   - cell 2: the full-width "Published on …" date line (above the grid).
 *   - cell 3: the LEFT body column (the "Downloadable documents" group).
 *   - cell 4: the RIGHT body column (Press release + Webcast + any other group,
 *     stacked).
 * The two columns render as a 2-col CSS grid (see accordion.css), matching the
 * source. Legacy shapes are still accepted: 3-cell [label | flag | body] and
 * 2-cell [label | body] fall back to a single-column body.
 *
 * Rendered with native <details>/<summary> so it's accessible and
 * keyboard-operable with no extra JS state. Each item keeps its own open state;
 * inside section-based tabs, a hidden panel's open items simply stay open and
 * become visible when that tab is selected (matching the source, where every
 * tab carries its own authored expansion).
 *
 * @param {Element} block the accordion block element
 */

// Move all children of `cell` into `dest` (no-op if cell is empty/whitespace).
function moveInto(dest, cell) {
  if (!cell) return;
  while (cell.firstChild) dest.append(cell.firstChild);
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const label = cells[0];

    const details = document.createElement('details');
    details.className = 'accordion-item';

    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.textContent = (label ? label.textContent : '').trim();

    const content = document.createElement('div');
    content.className = 'accordion-item-body';

    let expanded = false;

    if (cells.length >= 4) {
      // Columned shape: [label | flag | published | left | (right)].
      expanded = /^expanded$/i.test((cells[1]?.textContent || '').trim());
      const published = cells[2];
      const leftCell = cells[3];
      const rightCell = cells[4]; // may be undefined/empty

      // Published-on line: full width, above the grid.
      if (published && published.textContent.trim()) {
        const pub = document.createElement('div');
        pub.className = 'accordion-item-published';
        moveInto(pub, published);
        content.append(pub);
      }

      // Two-column grid. Keep both columns even if one is empty so the layout
      // stays predictable; CSS collapses to one column on mobile.
      const grid = document.createElement('div');
      grid.className = 'accordion-item-grid';
      const left = document.createElement('div');
      left.className = 'accordion-item-col';
      moveInto(left, leftCell);
      const right = document.createElement('div');
      right.className = 'accordion-item-col';
      moveInto(right, rightCell);
      // If the right column has no content, drop it and let the left span full
      // width (single-column grid) rather than leaving a broken empty column.
      grid.append(left);
      if (right.childNodes.length) {
        grid.append(right);
      } else {
        grid.classList.add('accordion-item-grid-single');
      }
      content.append(grid);
    } else {
      // Legacy shapes: [label | flag | body] or [label | body].
      const hasFlagCell = cells.length >= 3;
      expanded = hasFlagCell && /^expanded$/i.test((cells[1]?.textContent || '').trim());
      const body = cells[cells.length - 1];
      if (body && body !== label) moveInto(content, body);
    }

    if (expanded) details.open = true; // honour the source's authored open state
    details.append(summary, content);
    row.replaceWith(details);
  });
}

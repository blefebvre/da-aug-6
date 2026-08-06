/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-event. Base block: cards (no-images variant).
 * Source: https://www.atlascopcogroup.com/en
 * Instance: #main .ds-brand-bg-extra-dark .grid-col-3.mb-4
 *
 * Three items in a grid:
 *   1) Investor report card (.ds-brand-teaser-card):
 *        pretitle "Investors" + h3 title + description + TWO CTA links.
 *   2) & 3) Calendar/event cards (.ds-brand-calendar-card):
 *        date badge (<p.cmp-teaser__date><span.day><span.date-rest>)
 *        + pretitle label + h3 title (item 3 has no description).
 * No images.
 *
 * Library structure (Cards, no images): 1 column, multiple rows.
 *   row1 = block name (added by createBlock)
 *   each subsequent row = ONE card in a single cell:
 *     date (event cards) + label + heading + description + CTA link(s).
 *
 * Each card is a .cmp-teaser; iterate those so both card shapes are captured.
 */
export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll('.teaser .cmp-teaser, .cmp-teaser'));

  const cells = [];
  cards.forEach((card) => {
    const dateBadge = card.querySelector('.cmp-teaser__date');
    const pretitle = card.querySelector('.cmp-teaser__pretitle');
    const title = card.querySelector('.cmp-teaser__title, h1, h2, h3, h4');
    const description = card.querySelector('.cmp-teaser__description');
    const ctaLinks = Array.from(card.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a'));

    const cell = [];

    // Date badge (event cards) — the day (<span.cmp-teaser__day>) and the rest
    // (<span.cmp-teaser__date-rest>) are adjacent with no whitespace between
    // them, so textContent would read "22Sep 2026". Join the span parts with a
    // space to produce "22 Sep 2026".
    if (dateBadge) {
      const parts = Array.from(dateBadge.querySelectorAll('span'))
        .map((s) => s.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const dateText = (parts.length ? parts.join(' ') : dateBadge.textContent)
        .replace(/\s+/g, ' ').trim();
      if (dateText) {
        const p = document.createElement('p');
        p.textContent = dateText;
        cell.push(p);
      }
    }
    if (pretitle) cell.push(pretitle);
    if (title) cell.push(title);

    // Skip an empty description (item 3's description holds only &nbsp; + empty ul).
    if (description && description.textContent.replace(/ /g, '').trim()) {
      cell.push(description);
    }
    ctaLinks.forEach((a) => cell.push(a));

    if (cell.length) cells.push([cell]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-event', cells });
  element.replaceWith(block);
}

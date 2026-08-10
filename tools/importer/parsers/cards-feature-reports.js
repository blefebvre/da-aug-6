/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the reports-and-presentations featured cards — the "cards-feature"
 * block (Cards, with-images variant). Source instance: #main .grid-col-3 (the
 * three featured document blocks: Quarterly Q2 2026 / Annual Report 2025 /
 * Capital Markets Day 2025).
 *
 * Block table (matches the Cards with-images convention): 2 columns, multiple
 * rows. Row 1 is the block name (added by createBlock). Each subsequent row is
 * ONE card: [ image | (title + description + CTA links) ].
 *   - cell 1: the card's cover image (mandatory first cell)
 *   - cell 2: heading, then date/description paragraphs, then the document links
 *
 * This page's card DOM differs from the homepage teaser cards: each card is a
 * `.cmp-container` holding exactly one heading; an outer container wraps all
 * three (and thus has 3 headings), so filtering to containers with a single
 * heading isolates the real cards.
 *
 * Scene7/DM images are emitted as <img>; the afterTransform dm-images
 * transformer converts them to responsive <picture> downstream.
 */
export default function parse(element, { document }) {
  // The 3 cards are the direct children of the grid's inner AEM grid; each holds
  // exactly one <h2> title. (Using the inner grid's direct children avoids the
  // per-card <h3> document-title headings tricking a "one heading" filter.)
  const innerGrid = element.querySelector('.aem-Grid') || element;
  const cards = Array.from(innerGrid.children)
    .filter((c) => c.querySelector && c.querySelector('h2'));

  const cells = [];
  cards.forEach((card) => {
    // Cover image = the first image that is NOT a per-link download thumbnail.
    const image = [...card.querySelectorAll('img')]
      .find((img) => !img.closest('.cmp-download')) || card.querySelector('img');

    const title = card.querySelector('h2, h1, h3');

    const textCell = [];
    if (title) {
      // Normalize the card title to an <h3> (cards-feature convention).
      const h = document.createElement('h3');
      h.textContent = title.textContent.trim();
      textCell.push(h);
    }

    // Date + short description: visible, non-link paragraphs outside download rows.
    const seenText = new Set();
    Array.from(card.querySelectorAll('p'))
      .filter((p) => p.textContent.trim() && !p.querySelector('a') && !p.closest('.cmp-download'))
      .forEach((p) => {
        const t = p.textContent.trim();
        if (seenText.has(t)) return;
        seenText.add(t);
        const para = document.createElement('p');
        para.textContent = t;
        textCell.push(para);
      });

    // Document + CTA links, one per line, deduped by text+href. Each card's
    // document titles are <h3><a>…</a></h3>; also grab standalone CTA links
    // ("Read the Annual Report highlights", "Webcast on demand").
    const seenLink = new Set();
    const linkList = document.createElement('ul');
    card.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      if (!href || !text) return;
      const key = `${text}|${href}`;
      if (seenLink.has(key)) return;
      seenLink.add(key);
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.setAttribute('href', href);
      link.textContent = text;
      li.appendChild(link);
      linkList.appendChild(li);
    });
    if (linkList.children.length) textCell.push(linkList);

    cells.push([image || '', textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}

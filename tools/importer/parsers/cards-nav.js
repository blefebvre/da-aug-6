/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-nav. Base block: cards (no-images variant).
 * Source: https://www.atlascopcogroup.com/en
 * Instance: #main .ds-brand-block-navigation-cards
 *
 * Three quick-nav cards (Careers / Investors / Media). Each card:
 *   <div.teaser.ds-brand-navigation-card>
 *     <a.cmp-teaser__link href>          <- whole card is the link
 *       <div.cmp-teaser__content>
 *         <p.cmp-teaser__pretitle>        <- category label
 *         <h2|h3.cmp-teaser__title>       <- card title
 *         <div.cmp-teaser__description>   <- one-line description
 * No images.
 *
 * Library structure (Cards, no images): 1 column, multiple rows.
 *   row1 = block name (added by createBlock)
 *   each subsequent row = ONE card in a single cell:
 *     heading + description + optional CTA link.
 *
 * There is no separate CTA text; the whole card links somewhere, so the
 * destination is preserved by turning the title into a linked heading.
 */
export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll('.teaser.ds-brand-navigation-card, .ds-brand-navigation-card'));

  const cells = [];
  cards.forEach((card) => {
    const link = card.querySelector('.cmp-teaser__link, a[href]');
    const href = link ? link.getAttribute('href') : null;
    const pretitle = card.querySelector('.cmp-teaser__pretitle');
    const title = card.querySelector('.cmp-teaser__title, h1, h2, h3, h4');
    const description = card.querySelector('.cmp-teaser__description');

    const cell = [];
    if (pretitle) cell.push(pretitle);
    if (title) {
      if (href) {
        // Preserve the card's navigation destination as a linked heading.
        const heading = document.createElement(title.tagName.toLowerCase());
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = title.textContent.trim();
        heading.appendChild(a);
        cell.push(heading);
      } else {
        cell.push(title);
      }
    }
    if (description) cell.push(description);

    // Only add a row if the card has content.
    if (cell.length) cells.push([cell]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-nav', cells });
  element.replaceWith(block);
}

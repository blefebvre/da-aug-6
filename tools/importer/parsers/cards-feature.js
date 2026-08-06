/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature. Base block: cards (with-images variant).
 * Source: https://www.atlascopcogroup.com/en
 * Instance: #main .ds-brand-bg-dark .grid-col-3.mb-12
 *
 * Three teaser cards (About us / Our brands / Business areas). Each card:
 *   <div.teaser.ds-brand-teaser-card>
 *     <div.cmp-teaser>
 *       <div.cmp-teaser__content>
 *         <h3.cmp-teaser__title>
 *         <div.cmp-teaser__description>
 *         <div.cmp-teaser__action-container><a.cmp-teaser__action-link>
 *       <div.cmp-teaser__image><img>
 *
 * Library structure (Cards, with images): 2 columns, multiple rows.
 *   row1 = block name (added by createBlock)
 *   each subsequent row = ONE card: [ image | (heading + description + CTA) ]
 *
 * Scene7/DM images extracted as <img>; the afterTransform dm-images
 * transformer converts them downstream.
 */
export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll('.teaser.ds-brand-teaser-card, .ds-brand-teaser-card'));

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector('.cmp-teaser__image img, img');
    const title = card.querySelector('.cmp-teaser__title, h1, h2, h3, h4');
    const description = card.querySelector('.cmp-teaser__description');
    const ctaLinks = Array.from(card.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a'));

    const textCell = [];
    if (title) textCell.push(title);
    if (description) textCell.push(description);
    ctaLinks.forEach((a) => textCell.push(a));

    // 2-column row: image cell | text cell. Pad the image cell with '' if the
    // card has no image so every row keeps the same column count.
    cells.push([image || '', textCell]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}

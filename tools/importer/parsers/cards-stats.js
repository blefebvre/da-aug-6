/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-stats. Base block: cards (no-images variant).
 * Source: https://www.atlascopcogroup.com/en
 * Instance: #main .grid-col-4
 *
 * Four key-figure items (.ds-brand-quickfacts). Each item:
 *   <div.cmp-teaser__content>
 *     <p.cmp-teaser__pretitle>   <- small label (e.g. "Revenues")
 *     <h3.cmp-teaser__title>     <- large numeric value (e.g. "15 BEUR")
 *
 * Three of the four items also contain a decorative Atlas Copco logotype
 * <img> (all the same "logotype-with-white-box-1" asset). It is brand chrome,
 * not per-figure content, so it is intentionally NOT extracted — the analysis
 * models this as the Cards "no images" variant (label + big value only).
 *
 * Library structure (Cards, no images): 1 column, multiple rows.
 *   row1 = block name (added by createBlock)
 *   each subsequent row = ONE figure in a single cell: label + value.
 */
export default function parse(element, { document }) {
  const items = Array.from(element.querySelectorAll('.teaser.ds-brand-quickfacts, .ds-brand-quickfacts'));

  const cells = [];
  items.forEach((item) => {
    const label = item.querySelector('.cmp-teaser__pretitle');
    const value = item.querySelector('.cmp-teaser__title, h1, h2, h3, h4');

    const cell = [];
    if (label) cell.push(label);
    if (value) cell.push(value);

    if (cell.length) cells.push([cell]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-stats', cells });
  element.replaceWith(block);
}

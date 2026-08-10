/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: split the top-of-page hero (breadcrumb + "FINANCIALS" eyebrow +
 * "Reports and presentations" H1 + lede paragraph) into its OWN section, styled
 * as a full-width light blue-grey band.
 *
 * The source renders this hero as a `.ds-brand-hero-teaser-banner` — a
 * full-bleed band, background rgb(243,246,247), that runs from the top of the
 * page down to just above the featured cards. In our import the hero arrives as
 * loose default content sharing the first section with the featured cards, so
 * there is no band and no section boundary.
 *
 * Fix (same mechanism as the dark tabs band): insert a section break (`<hr>`)
 * right before the featured cards grid, and drop a `Section Metadata` table with
 * `style | hero-light` into the hero portion above it. section-metadata.js maps
 * that to a `.hero-light` class on the section; styles.css paints the band and
 * its padding. Everything above the grid (breadcrumb/eyebrow/H1/lede) ends up in
 * the hero section; the cards (and everything after) start their own section on
 * white.
 *
 * Runs in beforeTransform, BEFORE the cards-feature parser replaces the grid —
 * we anchor on the source grid container, which still exists at that point.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Build a Section Metadata table (same shape WebImporter.Blocks.createBlock
// makes) carrying the section style. section-metadata.js turns `style | X` into
// the CSS class `.x` on the section.
function buildHeroMetadata(doc) {
  return WebImporter.Blocks.createBlock(doc, {
    name: 'Section Metadata',
    cells: { style: 'hero-light' },
  });
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  const doc = element.ownerDocument;

  // The featured cards grid is the first section boundary after the hero.
  const grid = element.querySelector('#main .ds-brand-container.grid-col-3')
    || element.querySelector('.ds-brand-container.grid-col-3');
  if (!grid) return;

  // There must be a hero H1 above the grid for this to be the hero split; guard
  // so the transformer is a no-op on pages without this pattern.
  const h1 = element.querySelector('h1');
  if (!h1 || !(h1.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING)) return;

  // Insert, immediately before the grid: the hero Section Metadata (closing the
  // hero section) followed by an <hr> (the section break before the cards).
  grid.parentNode.insertBefore(buildHeroMetadata(doc), grid);
  grid.parentNode.insertBefore(doc.createElement('hr'), grid);
}

/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base block: hero.
 * Source: https://www.atlascopcogroup.com/en
 *
 * Two instances on the homepage:
 *   1) #main .teaser.ds-brand-hero-large-banner — full-bleed hero: h1 title,
 *      description paragraph, background photograph (no CTA).
 *   2) #main .ds-brand-block-section-teaser — sustainability banner: pretitle
 *      label, h2 title, description, CTA link, background photograph.
 *
 * Library structure (Hero): 1 column, up to 3 rows.
 *   row1 = block name (added by createBlock)
 *   row2 = background image (optional)
 *   row3 = title + subheading + CTA (single content cell)
 *
 * Scene7/DM images are extracted as plain <img>; the afterTransform
 * dm-images transformer converts them downstream — do not strip them here.
 */
export default function parse(element, { document }) {
  // Heading — hero uses the teaser title (h1 on the large banner, h2 on the
  // section teaser). Fall back to any heading inside the block.
  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3');

  // Optional eyebrow/label above the title (e.g. "Sustainability").
  const pretitle = element.querySelector('.cmp-teaser__pretitle');

  // Description — the teaser description container holds the supporting copy.
  // NOTE: do not fall back to a bare `p`; the eyebrow/label is also a <p>
  // (.cmp-teaser__pretitle) and comes first in document order, which would
  // shadow the real description. Only fall back to a paragraph that is neither
  // the pretitle nor the title.
  const description = element.querySelector('.cmp-teaser__description')
    || element.querySelector('p:not(.cmp-teaser__pretitle):not(.cmp-teaser__title)');

  // CTA link(s) — action links inside the content box.
  const ctaLinks = Array.from(element.querySelectorAll(
    '.cmp-teaser__action-link, .cmp-teaser__action-container a',
  ));

  // Background image — the teaser image; extract as <img> (DM transformer later).
  const bgImage = element.querySelector('.cmp-teaser__image img, img');

  // Empty-block guard: nothing meaningful to place.
  if (!heading && !description && !bgImage) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background image (optional).
  if (bgImage) cells.push([bgImage]);

  // Row 3: single content cell holding eyebrow + heading + description + CTAs.
  const contentCell = [];
  if (pretitle) contentCell.push(pretitle);
  if (heading) contentCell.push(heading);
  if (description) contentCell.push(description);
  ctaLinks.forEach((a) => contentCell.push(a));
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}

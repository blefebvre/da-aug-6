/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media. Base block: columns.
 * Source: https://www.atlascopcogroup.com/en
 *
 * Two instances (each a single image + text band):
 *   1) #main .teaser.ds-brand-promo-card — People Podcast promo:
 *        pretitle "People Podcast" + h2 title + description + action-link CTA,
 *        with a photograph. (text | image)
 *   2) #main .ds-brand-container.grid-col-2.my-0.py-0 — CEO quote band:
 *        h3 quote title + attribution paragraph + a portrait image, plus a
 *        `<a class="cmp-button">` CTA that sits as a SIBLING of the .cmp-teaser
 *        (not inside .cmp-teaser__content). (text | image)
 *
 * Library structure (Columns): row1 = block name; subsequent rows = N cells,
 * one per column. Here each band is a single 2-column row: text | image.
 *
 * Because instance 2's CTA lives outside the teaser content, links and the
 * image are collected at the matched-element level (not just inside the
 * teaser content). Scene7/DM images are extracted as <img>; the afterTransform
 * dm-images transformer converts them downstream.
 */
export default function parse(element, { document }) {
  const pretitle = element.querySelector('.cmp-teaser__pretitle');
  const title = element.querySelector('.cmp-teaser__title, h1, h2, h3, h4');
  const description = element.querySelector('.cmp-teaser__description');

  // CTAs: teaser action links plus button anchors (instance 2's CTA is an
  // <a class="cmp-button"> sibling of the teaser). Restrict to real links
  // (a[href]) so <button> chrome is never captured.
  const ctaLinks = Array.from(element.querySelectorAll(
    'a.cmp-teaser__action-link, .cmp-teaser__action-container a[href], a.cmp-button[href]',
  ));

  // Image column — the teaser photograph / portrait.
  const image = element.querySelector('.cmp-teaser__image img, img');

  // Empty-block guard.
  if (!title && !description && !image) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Text column: eyebrow + heading + description + CTA link(s).
  const textCell = [];
  if (pretitle) textCell.push(pretitle);
  if (title) textCell.push(title);
  if (description) textCell.push(description);
  ctaLinks.forEach((a) => textCell.push(a));

  // Single 2-column band: text | image. Pad the image cell so the row keeps
  // two columns even when no image is present.
  const cells = [[textCell, image || '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}

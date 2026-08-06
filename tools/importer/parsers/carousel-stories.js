/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-stories. Base block: carousel.
 * Source: https://www.atlascopcogroup.com/en
 * Instance: #main .ds-brand-block-carousel
 *
 * The matched element wraps three things:
 *   - an intro teaser (.teaser-default): h2 "There is always a better way" +
 *     description — this is DEFAULT CONTENT and is preserved as siblings before
 *     the block (not pulled into the carousel).
 *   - two view-toggle buttons ("View as carousel" / "View as grid") — non-
 *     authorable UI chrome, dropped.
 *   - eight slides (.ds-splide-carousel__slide), each a teaser card with an
 *     h3 title, description, an action-link CTA, and an image.
 *
 * Library structure (Carousel): 2 columns per slide row: image | text
 *   row1 = block name (added by createBlock)
 *   each subsequent row = ONE slide: [ image | (heading + description + CTA) ]
 *
 * Scene7/DM images extracted as <img>; the afterTransform dm-images
 * transformer converts them downstream.
 */
export default function parse(element, { document }) {
  const slides = Array.from(element.querySelectorAll('.ds-splide-carousel__slide, .splide__slide'));

  const cells = [];
  slides.forEach((slide) => {
    const image = slide.querySelector('.cmp-teaser__image img, img');
    const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3, h4');
    const description = slide.querySelector('.cmp-teaser__description');
    const ctaLinks = Array.from(slide.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a'));

    const textCell = [];
    if (title) textCell.push(title);
    if (description) textCell.push(description);
    ctaLinks.forEach((a) => textCell.push(a));

    // 2-column slide row: image | text. Only add a slide that has content.
    if (image || textCell.length) {
      cells.push([image || '', textCell]);
    }
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Preserve the intro teaser (default content) as siblings BEFORE the block so
  // it is not lost when the matched element is replaced. The section's default
  // content (intro heading + paragraph) is authored outside the block.
  const introTeaser = element.querySelector('.teaser-default, .teaser.teaser-default');
  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-stories', cells });

  if (introTeaser) {
    // Keep only the intro's heading + description text; drop toggle buttons.
    const introContent = introTeaser.querySelector('.cmp-teaser__content') || introTeaser;
    element.replaceWith(introContent, block);
  } else {
    element.replaceWith(block);
  }
}

/**
 * columns-media
 * A media + text band: text column beside an image column, vertically centered
 * on desktop and stacked (image first) on mobile.
 *
 * Variants (auto-detected from authored content, matching the source design):
 *  - promo   : large H2 headline + gradient pill CTA (People Podcast band)
 *  - quote   : pull-quote H3 + bold attribution + outlined CTA (CEO quote band)
 *  - teaser  : label + H3 + description + text-link CTA (Careers / Innovation)
 *
 * Orientation:
 *  - default          : image on the right, text on the left
 *  - columns-media-reversed : image on the left, text on the right
 *    Applied when the author names the variant "reversed" OR to alternate
 *    instances that share a section (produces the source's zig-zag bands).
 *
 * @param {Element} block The columns-media block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  block.classList.add(`columns-media-${(rows[0]?.children.length) || 0}-cols`);

  // Tag each cell as image or text column.
  rows.forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic && col.children.length === 1) {
        col.classList.add('columns-media-img-col');
      } else {
        col.classList.add('columns-media-text-col');
      }
    });
  });

  // --- Variant detection -------------------------------------------------
  const textCol = block.querySelector('.columns-media-text-col');
  const firstEl = textCol && textCol.firstElementChild;
  const startsWithHeading = firstEl && /^H[1-6]$/.test(firstEl.tagName);

  if (block.querySelector('h2')) {
    block.classList.add('columns-media-promo');
  } else if (startsWithHeading && textCol.querySelector('strong')) {
    block.classList.add('columns-media-quote');
    // Pull-quote: the portrait floats top-left and the quote text wraps beside
    // and below it. CSS float only wraps content that follows in source order,
    // so move the image column ahead of the text column.
    const row = block.firstElementChild;
    const imgCol = row && row.querySelector(':scope > .columns-media-img-col');
    if (imgCol && imgCol !== row.firstElementChild) {
      row.insertBefore(imgCol, row.firstElementChild);
    }
  } else {
    block.classList.add('columns-media-teaser');
  }

  // --- Orientation -------------------------------------------------------
  // Authored cell order is always [text, image], which renders as text-left /
  // image-right (the default). `columns-media-reversed` flips it to image-left.
  // We flip for: an author-named "reversed" variant, the pull-quote (portrait
  // sits on the left in the source), and alternating instances that share a
  // section so stacked bands zig-zag like the source.
  const wrapper = block.parentElement;
  const section = wrapper && wrapper.parentElement;
  let alternate = false;
  if (section) {
    const mediaWrappers = [...section.children]
      .filter((c) => c.querySelector(':scope > .columns-media'));
    const idx = mediaWrappers.indexOf(wrapper);
    alternate = mediaWrappers.length > 1 && idx % 2 === 0;
  }
  if (block.classList.contains('reversed')
    || block.classList.contains('columns-media-quote')
    || alternate) {
    block.classList.add('columns-media-reversed');
  }
}

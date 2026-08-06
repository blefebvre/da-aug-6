/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-news. Base block: cards (no-images variant).
 * Source: https://www.atlascopcogroup.com/en
 * Instance: #main .recentpressrelease .articles-container
 *
 * Four press-release entries. Each entry:
 *   <article>
 *     <div.recent-press-release>
 *       <h3.press-release-title>
 *       <p.press-release-date>
 *       <p.press-release-tags><span.press-release-tag>...</span></p>
 *       <p.press-release-description>
 *       <p><a.press-release-page-link href></a></p>   <- empty-text link
 * No images.
 *
 * Library structure (Cards, no images): 1 column, multiple rows.
 *   row1 = block name (added by createBlock)
 *   each subsequent row = ONE press release in a single cell:
 *     heading + date + tags + description + CTA link.
 *
 * The source page-link has an href but no visible text; its destination is
 * preserved by linking the title heading. Tags are flattened to a single
 * paragraph so the categorisation text is retained.
 */
export default function parse(element, { document }) {
  const articles = Array.from(element.querySelectorAll('article'));

  const cells = [];
  articles.forEach((article) => {
    const title = article.querySelector('.press-release-title, h1, h2, h3, h4');
    const date = article.querySelector('.press-release-date');
    const tagsEl = article.querySelector('.press-release-tags');
    const description = article.querySelector('.press-release-description');
    const pageLink = article.querySelector('.press-release-page-link, a[href]');
    const href = pageLink ? pageLink.getAttribute('href') : null;

    const cell = [];

    // Title, linked to the press-release page when a destination exists.
    if (title) {
      if (href) {
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
    if (date) cell.push(date);

    // Tags: collapse the tag spans into one comma-separated paragraph so the
    // categories survive without a nested inline structure.
    if (tagsEl) {
      const tags = Array.from(tagsEl.querySelectorAll('.press-release-tag'))
        .map((s) => s.textContent.trim())
        .filter(Boolean);
      if (tags.length) {
        const p = document.createElement('p');
        p.textContent = tags.join(', ');
        cell.push(p);
      } else {
        cell.push(tagsEl);
      }
    }
    if (description) cell.push(description);

    if (cell.length) cells.push([cell]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-news', cells });
  element.replaceWith(block);
}

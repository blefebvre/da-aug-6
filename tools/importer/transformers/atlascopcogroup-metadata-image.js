/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: cap/replace oversized page-metadata (OG/social) images.
 *
 * WebImporter.rules.createMetadata() copies the source page's og:image URL
 * verbatim into the page Metadata block's "Image" row. Some Atlas Copco pages
 * (e.g. reports-and-presentations) point og:image at a RAW AEM DAM original —
 * `www.atlascopcogroup.com/content/dam/.../Annual-General-Meeting-2023.jpg` is
 * 33.7 MB. Document Authoring refuses to preview a page whose source references
 * an image over 20 MB, so the whole page fails to preview.
 *
 * The DAM host ignores width/quality query params (always serves the full
 * original), so the URL can't be downscaled in place, and re-encoding bytes at
 * import time isn't feasible in the in-browser importer. This transformer
 * therefore rewrites the metadata Image to a bounded rendition when one is
 * derivable, otherwise removes the Image row so the page previews (the site
 * falls back to a default OG image). Runs in afterTransform, AFTER
 * createMetadata has built the block.
 *
 * A DM/Scene7 og:image (which supports `?wid=`) is instead capped to a safe
 * width rather than dropped, preserving the social image.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Max width we request for a DM/Scene7 social image (well under 20 MB).
const OG_IMAGE_WIDTH = 1200;

function isScene7(url) {
  try {
    return new URL(url, 'https://x/').pathname.startsWith('/is/image/');
  } catch {
    return false;
  }
}

function boundScene7(url) {
  const normalized = url.startsWith('//') ? `https:${url}` : url;
  const qIdx = normalized.indexOf('?');
  const base = qIdx >= 0 ? normalized.slice(0, qIdx) : normalized;
  const params = (qIdx >= 0 ? normalized.slice(qIdx + 1) : '')
    .split('&')
    .filter((p) => p && !/^wid=/.test(p) && !/^fmt=/.test(p));
  params.push(`wid=${OG_IMAGE_WIDTH}`, 'fmt=jpg');
  return `${base}?${params.join('&')}`;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  // WebImporter.rules.createMetadata builds the page Metadata block as a
  // <table> (first <th> = "Metadata", then one <tr><td>key</td><td>value</td>).
  // Find each metadata table's "Image" row. (Guard on a first-cell "Metadata"
  // header so we don't touch unrelated tables.)
  const tables = [...element.querySelectorAll('table')].filter((t) => {
    const first = t.querySelector('th, td');
    return first && first.textContent.trim().toLowerCase() === 'metadata';
  });

  tables.forEach((table) => {
    [...table.querySelectorAll('tr')].forEach((row) => {
      const cells = [...row.children];
      if (cells.length < 2) return;
      if (cells[0].textContent.trim().toLowerCase() !== 'image') return;

      const img = cells[1].querySelector('img');
      const src = img && (img.getAttribute('src') || '');
      if (!src) {
        row.remove();
        return;
      }

      if (isScene7(src)) {
        // Downscale in place — Scene7 honors wid=.
        img.setAttribute('src', boundScene7(src));
        return;
      }

      // Raw DAM (or any non-DM) original that can't be resized via URL: remove
      // the Image row entirely so the oversized asset is never referenced and
      // the page can preview. The site falls back to its default OG image.
      // eslint-disable-next-line no-console
      console.warn('Dropping oversized/unbounded metadata image:', src);
      row.remove();
    });
  });
}

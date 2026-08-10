/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsFeatureReportsParser from './parsers/cards-feature-reports.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/atlascopcogroup-cleanup.js';
import reportsTabsTransformer from './transformers/atlascopcogroup-reports-tabs.js';
import dmImagesTransformer from './transformers/atlascopcogroup-dm-images.js';
import metadataImageTransformer from './transformers/atlascopcogroup-metadata-image.js';

const parsers = {
  'cards-feature': cardsFeatureReportsParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'reports-and-presentations',
  description: 'Investor reports and presentations: hero, three featured document blocks, an "Overview of documents" year-tabs widget (section-based tabs), and a related-links cards row',
  urls: [
    'https://www.atlascopcogroup.com/en/investors/reports-and-presentations',
  ],
  blocks: [
    {
      name: 'cards-feature',
      // The featured 3-card row only. `.ds-brand-container` distinguishes it
      // from the bottom "You might also be interested in" cards, which are a
      // separate `.grid-col-3.teaser-line-clamp-3` grid.
      instances: ['#main .ds-brand-container.grid-col-3'],
    },
  ],
  // Only the "interested in" cards row is a styled block; everything else is
  // default content. The tabs transformer emits its own tab sections + breaks.
  sections: [],
};

// Cleanup + tabs flattening first, then DM image conversion. The section
// transformer is intentionally omitted (no multi-section metadata to apply
// beyond the tab sections the reports-tabs transformer emits itself).
const transformers = [
  cleanupTransformer,
  reportsTabsTransformer,
  dmImagesTransformer,
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      let elements;
      try {
        elements = document.querySelectorAll(selector);
      } catch (e) {
        console.warn(`Invalid selector for "${blockDef.name}": ${selector}`, e);
        return;
      }
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform (cleanup, flatten tabs into tab sections, section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse blocks (skip already-detached)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      }
    });

    // 4. afterTransform (DM images)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5b. Cap/replace oversized page-metadata (OG) images. Runs AFTER
    // createMetadata built the Metadata block. The source og:image here is a
    // 33.7 MB raw DAM original that DA refuses to preview (>20 MB limit).
    try {
      metadataImageTransformer('afterTransform', main, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error('metadata-image transformer failed:', e);
    }

    // 6. Sanitized path (never the root here, so no /index special-case needed).
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};

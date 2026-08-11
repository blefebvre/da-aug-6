/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/atlascopcogroup-cleanup.js';
import faqTabsTransformer from './transformers/atlascopcogroup-faq-tabs.js';
import dmImagesTransformer from './transformers/atlascopcogroup-dm-images.js';
import metadataImageTransformer from './transformers/atlascopcogroup-metadata-image.js';
import breadcrumbTransformer from './transformers/atlascopcogroup-breadcrumb.js';

const parsers = {
  'hero-banner': heroBannerParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'careers-faq',
  description: 'Careers "Frequently asked questions": a full-bleed photographic hero (hero-banner) over a light-grey section-based tabs widget (3 tabs) of collapsible FAQ accordions',
  urls: [
    'https://www.atlascopcogroup.com/en/careers/jobs/frequently-asked-questions',
  ],
  blocks: [
    {
      name: 'hero-banner',
      // The top-of-page full-bleed photographic hero (ds-brand-hero-large-banner).
      instances: ['#main .teaser.ds-brand-hero-large-banner'],
    },
  ],
  // The tabs widget is emitted by the faq-tabs transformer (flattens .cmp-tabs
  // into per-tab | tab | sections); everything else is default content.
  sections: [],
};

// Cleanup + tabs flattening first, then DM image conversion.
const transformers = [
  cleanupTransformer,
  faqTabsTransformer,
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

    // 5b. Cap/replace oversized page-metadata (OG) images (>20 MB blocks DA
    // preview). Runs after createMetadata built the Metadata block.
    try {
      metadataImageTransformer('afterTransform', main, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error('metadata-image transformer failed:', e);
    }

    // 5c. Persist the URL-derived breadcrumb trail into page metadata and strip
    // the authored breadcrumb markup. Runs after createMetadata.
    try {
      breadcrumbTransformer('afterTransform', main, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error('breadcrumb transformer failed:', e);
    }

    // 6. Sanitized path.
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

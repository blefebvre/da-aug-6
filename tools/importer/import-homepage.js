/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS - one per block variant used by this template
import heroBannerParser from './parsers/hero-banner.js';
import cardsNavParser from './parsers/cards-nav.js';
import columnsMediaParser from './parsers/columns-media.js';
import cardsFeatureParser from './parsers/cards-feature.js';
import cardsNewsParser from './parsers/cards-news.js';
import cardsEventParser from './parsers/cards-event.js';
import cardsStatsParser from './parsers/cards-stats.js';
import carouselStoriesParser from './parsers/carousel-stories.js';

// TRANSFORMER IMPORTS - all files in tools/importer/transformers/
import cleanupTransformer from './transformers/atlascopcogroup-cleanup.js';
import sectionsTransformer from './transformers/atlascopcogroup-sections.js';
import dmImagesTransformer from './transformers/atlascopcogroup-dm-images.js';

// PARSER REGISTRY - map block variant name to parser function
const parsers = {
  'hero-banner': heroBannerParser,
  'cards-nav': cardsNavParser,
  'columns-media': columnsMediaParser,
  'cards-feature': cardsFeatureParser,
  'cards-news': cardsNewsParser,
  'cards-event': cardsEventParser,
  'cards-stats': cardsStatsParser,
  'carousel-stories': carouselStoriesParser,
};

// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Atlas Copco Group corporate homepage with hero banner, navigation cards, section teasers, recent press releases, investor results/events, key figures, and an innovation stories carousel',
  urls: [
    'https://www.atlascopcogroup.com/en',
  ],
  blocks: [
    {
      name: 'hero-banner',
      instances: [
        '#main .teaser.ds-brand-hero-large-banner',
        '#main .ds-brand-block-section-teaser',
      ],
    },
    {
      name: 'cards-nav',
      instances: ['#main .ds-brand-block-navigation-cards'],
    },
    {
      name: 'columns-media',
      instances: [
        '#main .teaser.ds-brand-promo-card',
        '#main .ds-brand-container.grid-col-2.my-0.py-0',
        '#main .teaser.ds-brand-teaser-card.mb-12',
        '#main .teaser.ds-brand-teaser-card.mb-8.ds-brand-reversed',
      ],
    },
    {
      name: 'cards-feature',
      instances: ['#main .ds-brand-bg-dark .grid-col-3.mb-12'],
    },
    {
      name: 'cards-news',
      instances: ['#main .recentpressrelease .articles-container'],
    },
    {
      name: 'cards-event',
      instances: ['#main .ds-brand-bg-extra-dark .grid-col-3.mb-4'],
    },
    {
      name: 'cards-stats',
      instances: ['#main .grid-col-4'],
    },
    {
      name: 'carousel-stories',
      instances: ['#main .ds-brand-block-carousel'],
    },
  ],
  sections: [
    { id: 's1', name: 'Hero banner + quicklink cards', selector: '#main .teaser.ds-brand-hero-large-banner', style: null, blocks: ['hero-banner', 'cards-nav'], defaultContent: [] },
    { id: 's2', name: 'People Podcast promo', selector: '#main .teaser.ds-brand-promo-card', style: null, blocks: ['columns-media'], defaultContent: [] },
    { id: 's3', name: 'Solutions for real challenges and needs', selector: '#main .ds-brand-bg-dark', style: 'dark', blocks: ['cards-feature'], defaultContent: ['#main .ds-brand-bg-dark h2', '#main .ds-brand-bg-dark .cmp-text p'] },
    { id: 's4', name: 'Sustainability banner', selector: '#main .ds-brand-block-section-teaser', style: 'filled-gold', blocks: ['hero-banner'], defaultContent: [] },
    { id: 's5', name: 'Recent press releases', selector: '#main .recentpressrelease', style: null, blocks: ['cards-news'], defaultContent: ['#main .recentpressrelease .banner-title', '#main .recentpressrelease .read-all-container'] },
    { id: 's6', name: 'Spacer', selector: '#main .ds-brand-container.ds-brand-filled-dark + .container.px-0.py-4', style: null, blocks: [], defaultContent: [] },
    { id: 's7', name: 'Latest results and upcoming events', selector: '#main .ds-brand-bg-extra-dark', style: 'extra-dark', blocks: ['cards-event'], defaultContent: ['#main .ds-brand-bg-extra-dark .ds-brand-text-positive'] },
    { id: 's8', name: 'The Group in 2025 (key figures)', selector: '#main .ds-brand-container:has(.grid-col-4)', style: null, blocks: ['cards-stats'], defaultContent: ['#main .ds-brand-container:has(.grid-col-4) .cmp-title'] },
    { id: 's9', name: 'CEO quote', selector: '#main .ds-brand-container.grid-col-2.my-0.py-0', style: null, blocks: ['columns-media'], defaultContent: ['#main .ds-brand-container.grid-col-2.my-0.py-0 blockquote'] },
    { id: 's10', name: 'Jobs & Innovation promos', selector: '#main .ds-brand-container.grid-col-2.my-0.py-0 + .ds-brand-container', style: null, blocks: ['columns-media'], defaultContent: [] },
    { id: 's11', name: 'There is always a better way (innovation stories carousel)', selector: '#main .ds-brand-block-carousel', style: 'bg-gold', blocks: ['carousel-stories'], defaultContent: ['#main .ds-brand-block-carousel .cmp-teaser__title', '#main .ds-brand-block-carousel .cmp-teaser__description'] },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata, then DM image conversion.
// Section transformer only runs when the template defines 2+ sections.
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
  dmImagesTransformer,
];

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
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
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers.
    //    Skip elements already replaced by a prior parser (detached from DOM).
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform transformers (final cleanup + section breaks/metadata + DM images)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path. Map the root/homepage URL to `/index`:
    //    the root pathname is `/`, which becomes '' after trailing-slash
    //    stripping — an empty path crashes the bundled importer.
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

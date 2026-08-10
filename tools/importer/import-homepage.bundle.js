var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/hero-banner.js
  function parse(element, { document }) {
    const heading = element.querySelector(".cmp-teaser__title, h1, h2, h3");
    const pretitle = element.querySelector(".cmp-teaser__pretitle");
    const description = element.querySelector(".cmp-teaser__description") || element.querySelector("p:not(.cmp-teaser__pretitle):not(.cmp-teaser__title)");
    const ctaLinks = Array.from(element.querySelectorAll(
      ".cmp-teaser__action-link, .cmp-teaser__action-container a"
    ));
    const bgImage = element.querySelector(".cmp-teaser__image img, img");
    if (!heading && !description && !bgImage) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (bgImage) cells.push([bgImage]);
    const contentCell = [];
    if (pretitle) contentCell.push(pretitle);
    if (heading) contentCell.push(heading);
    if (description) contentCell.push(description);
    ctaLinks.forEach((a) => contentCell.push(a));
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-nav.js
  function parse2(element, { document }) {
    const cards = Array.from(element.querySelectorAll(".teaser.ds-brand-navigation-card, .ds-brand-navigation-card"));
    const cells = [];
    cards.forEach((card) => {
      const link = card.querySelector(".cmp-teaser__link, a[href]");
      const href = link ? link.getAttribute("href") : null;
      const pretitle = card.querySelector(".cmp-teaser__pretitle");
      const title = card.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
      const description = card.querySelector(".cmp-teaser__description");
      const cell = [];
      if (pretitle) cell.push(pretitle);
      if (title) {
        if (href) {
          const heading = document.createElement(title.tagName.toLowerCase());
          const a = document.createElement("a");
          a.setAttribute("href", href);
          a.textContent = title.textContent.trim();
          heading.appendChild(a);
          cell.push(heading);
        } else {
          cell.push(title);
        }
      }
      if (description) cell.push(description);
      if (cell.length) cells.push([cell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-nav", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-media.js
  function parse3(element, { document }) {
    const pretitle = element.querySelector(".cmp-teaser__pretitle");
    const title = element.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
    const description = element.querySelector(".cmp-teaser__description");
    const ctaLinks = Array.from(element.querySelectorAll(
      "a.cmp-teaser__action-link, .cmp-teaser__action-container a[href], a.cmp-button[href]"
    ));
    const image = element.querySelector(".cmp-teaser__image img, img");
    if (!title && !description && !image) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const textCell = [];
    if (pretitle) textCell.push(pretitle);
    if (title) textCell.push(title);
    if (description) textCell.push(description);
    ctaLinks.forEach((a) => textCell.push(a));
    const cells = [[textCell, image || ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-media", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-feature.js
  function parse4(element, { document }) {
    const cards = Array.from(element.querySelectorAll(".teaser.ds-brand-teaser-card, .ds-brand-teaser-card"));
    const cells = [];
    cards.forEach((card) => {
      const image = card.querySelector(".cmp-teaser__image img, img");
      const title = card.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
      const description = card.querySelector(".cmp-teaser__description");
      const ctaLinks = Array.from(card.querySelectorAll(".cmp-teaser__action-link, .cmp-teaser__action-container a"));
      const textCell = [];
      if (title) textCell.push(title);
      if (description) textCell.push(description);
      ctaLinks.forEach((a) => textCell.push(a));
      cells.push([image || "", textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-news.js
  function parse5(element, { document }) {
    const articles = Array.from(element.querySelectorAll("article"));
    const cells = [];
    articles.forEach((article) => {
      const title = article.querySelector(".press-release-title, h1, h2, h3, h4");
      const date = article.querySelector(".press-release-date");
      const tagsEl = article.querySelector(".press-release-tags");
      const description = article.querySelector(".press-release-description");
      const pageLink = article.querySelector(".press-release-page-link, a[href]");
      const href = pageLink ? pageLink.getAttribute("href") : null;
      const cell = [];
      if (title) cell.push(title);
      if (date) cell.push(date);
      if (tagsEl) {
        const tags = Array.from(tagsEl.querySelectorAll(".press-release-tag")).map((s) => s.textContent.trim()).filter(Boolean);
        if (tags.length) {
          const p = document.createElement("p");
          p.textContent = tags.join(", ");
          cell.push(p);
        } else {
          cell.push(tagsEl);
        }
      }
      if (description) cell.push(description);
      if (href) {
        const p = document.createElement("p");
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = "Read more";
        p.appendChild(a);
        cell.push(p);
      }
      if (cell.length) cells.push([cell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-news", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-event.js
  function parse6(element, { document }) {
    const cards = Array.from(element.querySelectorAll(".teaser .cmp-teaser, .cmp-teaser"));
    const cells = [];
    cards.forEach((card) => {
      const dateBadge = card.querySelector(".cmp-teaser__date");
      const pretitle = card.querySelector(".cmp-teaser__pretitle");
      const title = card.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
      const description = card.querySelector(".cmp-teaser__description");
      const ctaLinks = Array.from(card.querySelectorAll(".cmp-teaser__action-link, .cmp-teaser__action-container a"));
      const cell = [];
      if (dateBadge) {
        const parts = Array.from(dateBadge.querySelectorAll("span")).map((s) => s.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
        const dateText = (parts.length ? parts.join(" ") : dateBadge.textContent).replace(/\s+/g, " ").trim();
        if (dateText) {
          const p = document.createElement("p");
          p.textContent = dateText;
          cell.push(p);
        }
      }
      if (pretitle) cell.push(pretitle);
      if (title) cell.push(title);
      if (description && description.textContent.replace(/ /g, "").trim()) {
        cell.push(description);
      }
      ctaLinks.forEach((a) => cell.push(a));
      if (cell.length) cells.push([cell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-event", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-stats.js
  function parse7(element, { document }) {
    const items = Array.from(element.querySelectorAll(".teaser.ds-brand-quickfacts, .ds-brand-quickfacts"));
    const cells = [];
    items.forEach((item) => {
      const label = item.querySelector(".cmp-teaser__pretitle");
      const value = item.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
      const cell = [];
      if (label) cell.push(label);
      if (value) cell.push(value);
      if (cell.length) cells.push([cell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-stats", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-stories.js
  function parse8(element, { document }) {
    const slides = Array.from(element.querySelectorAll(".ds-splide-carousel__slide, .splide__slide"));
    const cells = [];
    slides.forEach((slide) => {
      const image = slide.querySelector(".cmp-teaser__image img, img");
      const title = slide.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
      const description = slide.querySelector(".cmp-teaser__description");
      const ctaLinks = Array.from(slide.querySelectorAll(".cmp-teaser__action-link, .cmp-teaser__action-container a"));
      const textCell = [];
      if (title) textCell.push(title);
      if (description) textCell.push(description);
      ctaLinks.forEach((a) => textCell.push(a));
      if (image || textCell.length) {
        cells.push([image || "", textCell]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const introTeaser = element.querySelector(".teaser-default, .teaser.teaser-default");
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-stories", cells });
    if (introTeaser) {
      const introContent = introTeaser.querySelector(".cmp-teaser__content") || introTeaser;
      element.replaceWith(introContent, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/transformers/atlascopcogroup-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        "#ot-sdk-btn",
        ".ot-sdk-show-settings",
        ".onetrust-pc-dark-filter",
        "iframe.ot-text-resize"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".ds-brand-locator",
        "#locator-config",
        "#ds-brand-locator-continue-button",
        "#ds-brand-locator-close-button"
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[id^="survey_"]',
        "#fb-root",
        'button[aria-label*="Feedback" i]'
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.ds-brand-header",
        "footer.ds-brand-footer",
        "header",
        "footer"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".ds-brand-mega-menu",
        ".ds-brand-main-navigation",
        ".ds-brand-language-switcher",
        ".ds-brand-header__overlay",
        ".search-box.search-widget",
        ".algolia-box",
        ".ds-brand-skip-content-button"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "script",
        "noscript",
        "link",
        "style",
        "iframe",
        "template"
      ]);
      const trackingAttrs = [
        "data-tms-scrolltracking",
        "data-tms-scrolltracking-tracked",
        "data-cmp-link-accessibility-enabled",
        "data-cmp-link-accessibility-text",
        "onclick"
      ];
      trackingAttrs.forEach((attr) => {
        if (element.hasAttribute && element.hasAttribute(attr)) element.removeAttribute(attr);
      });
      element.querySelectorAll("[data-tms-scrolltracking], [data-tms-scrolltracking-tracked], [data-cmp-link-accessibility-enabled], [data-cmp-link-accessibility-text], [onclick]").forEach((el) => {
        trackingAttrs.forEach((attr) => el.removeAttribute(attr));
      });
    }
  }

  // tools/importer/transformers/atlascopcogroup-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook2.beforeTransform) return;
    const template = payload && payload.template;
    const sections = template && template.sections;
    if (!sections || !Array.isArray(sections) || sections.length < 2) return;
    const doc = element.ownerDocument;
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section || !section.selector) continue;
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) {
        console.warn("Section selector matched no element, skipping:", section.selector);
        continue;
      }
      if (section.style) {
        const metadataBlock = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        if (sectionEl.nextSibling) {
          sectionEl.parentNode.insertBefore(metadataBlock, sectionEl.nextSibling);
        } else {
          sectionEl.parentNode.appendChild(metadataBlock);
        }
      }
      if (i > 0) {
        const hr = doc.createElement("hr");
        sectionEl.parentNode.insertBefore(hr, sectionEl);
      }
    }
  }

  // tools/importer/transformers/atlascopcogroup-dm-images.js
  function detectDynamicMediaUrl(urlStr) {
    let u;
    try {
      u = new URL(urlStr, "https://x/");
    } catch {
      return false;
    }
    if (u.pathname.startsWith("/is/image/")) {
      return "scene7";
    }
    if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname) && u.pathname.startsWith("/adobe/assets/urn:")) {
      return "dm-openapi";
    }
    return false;
  }
  var LINKED_DM_INLINE_WRAPPER_TAGS = /* @__PURE__ */ new Set(["PICTURE"]);
  var LINKED_DM_WRAPPER_SIBLING_TAGS = /* @__PURE__ */ new Set(["SOURCE"]);
  function findLinkedDmCarrier(img) {
    if (!img || !img.parentElement) return null;
    let node = img;
    let parent = img.parentElement;
    while (parent && LINKED_DM_INLINE_WRAPPER_TAGS.has(parent.tagName)) {
      let foundNode = false;
      for (const child of parent.children) {
        if (child === node) {
          foundNode = true;
        } else if (!LINKED_DM_WRAPPER_SIBLING_TAGS.has(child.tagName)) {
          return null;
        }
      }
      if (!foundNode) return null;
      node = parent;
      parent = parent.parentElement;
    }
    if (!parent || parent.tagName !== "A") return null;
    if (parent.children.length !== 1 || parent.children[0] !== node) return null;
    if (parent.textContent.trim() !== "") return null;
    return parent;
  }
  var EMPTY_ALT_SENTINEL = "Image without alt text";
  function altToLinkText(alt) {
    return alt || EMPTY_ALT_SENTINEL;
  }
  function transform3(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const doc = element.ownerDocument;
    element.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!detectDynamicMediaUrl(src)) return;
      const alt = img.getAttribute("alt") || "";
      const linkedAnchor = findLinkedDmCarrier(img);
      if (linkedAnchor) {
        linkedAnchor.setAttribute("title", src);
        linkedAnchor.textContent = altToLinkText(alt);
        return;
      }
      const parent = img.parentElement;
      if (parent && parent.tagName === "A") {
        console.warn("DM image inside mixed-content anchor, skipped:", src);
        return;
      }
      const a = doc.createElement("a");
      a.href = src;
      a.textContent = altToLinkText(alt);
      img.replaceWith(a);
    });
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "hero-banner": parse,
    "cards-nav": parse2,
    "columns-media": parse3,
    "cards-feature": parse4,
    "cards-news": parse5,
    "cards-event": parse6,
    "cards-stats": parse7,
    "carousel-stories": parse8
  };
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "Atlas Copco Group corporate homepage with hero banner, navigation cards, section teasers, recent press releases, investor results/events, key figures, and an innovation stories carousel",
    urls: [
      "https://www.atlascopcogroup.com/en"
    ],
    blocks: [
      {
        name: "hero-banner",
        instances: [
          "#main .teaser.ds-brand-hero-large-banner",
          "#main .ds-brand-block-section-teaser"
        ]
      },
      {
        name: "cards-nav",
        instances: ["#main .ds-brand-block-navigation-cards"]
      },
      {
        name: "columns-media",
        instances: [
          "#main .teaser.ds-brand-promo-card",
          "#main .ds-brand-container.grid-col-2.my-0.py-0",
          "#main .teaser.ds-brand-teaser-card.mb-12",
          "#main .teaser.ds-brand-teaser-card.mb-8.ds-brand-reversed"
        ]
      },
      {
        name: "cards-feature",
        instances: ["#main .ds-brand-bg-dark .grid-col-3.mb-12"]
      },
      {
        name: "cards-news",
        instances: ["#main .recentpressrelease .articles-container"]
      },
      {
        name: "cards-event",
        instances: ["#main .ds-brand-bg-extra-dark .grid-col-3.mb-4"]
      },
      {
        name: "cards-stats",
        instances: ["#main .grid-col-4"]
      },
      {
        name: "carousel-stories",
        instances: ["#main .ds-brand-block-carousel"]
      }
    ],
    sections: [
      { id: "s1", name: "Hero banner + quicklink cards", selector: "#main .teaser.ds-brand-hero-large-banner", style: null, blocks: ["hero-banner", "cards-nav"], defaultContent: [] },
      { id: "s2", name: "People Podcast promo", selector: "#main .teaser.ds-brand-promo-card", style: null, blocks: ["columns-media"], defaultContent: [] },
      { id: "s3", name: "Solutions for real challenges and needs", selector: "#main .ds-brand-bg-dark", style: "dark", blocks: ["cards-feature"], defaultContent: ["#main .ds-brand-bg-dark h2", "#main .ds-brand-bg-dark .cmp-text p"] },
      { id: "s4", name: "Sustainability banner", selector: "#main .ds-brand-block-section-teaser", style: "filled-gold", blocks: ["hero-banner"], defaultContent: [] },
      { id: "s5", name: "Recent press releases", selector: "#main .recentpressrelease", style: null, blocks: ["cards-news"], defaultContent: ["#main .recentpressrelease .banner-title", "#main .recentpressrelease .read-all-container"] },
      { id: "s6", name: "Spacer", selector: "#main .ds-brand-container.ds-brand-filled-dark + .container.px-0.py-4", style: null, blocks: [], defaultContent: [] },
      { id: "s7", name: "Latest results and upcoming events", selector: "#main .ds-brand-bg-extra-dark", style: "extra-dark", blocks: ["cards-event"], defaultContent: ["#main .ds-brand-bg-extra-dark .ds-brand-text-positive"] },
      { id: "s8", name: "The Group in 2025 (key figures)", selector: "#main .ds-brand-container:has(.grid-col-4)", style: null, blocks: ["cards-stats"], defaultContent: ["#main .ds-brand-container:has(.grid-col-4) .cmp-title"] },
      { id: "s9", name: "CEO quote", selector: "#main .ds-brand-container.grid-col-2.my-0.py-0", style: null, blocks: ["columns-media"], defaultContent: ["#main .ds-brand-container.grid-col-2.my-0.py-0 blockquote"] },
      { id: "s10", name: "Jobs & Innovation promos", selector: "#main .ds-brand-container.grid-col-2.my-0.py-0 + .ds-brand-container", style: null, blocks: ["columns-media"], defaultContent: [] },
      { id: "s11", name: "There is always a better way (innovation stories carousel)", selector: "#main .ds-brand-block-carousel", style: "bg-gold", blocks: ["carousel-stories"], defaultContent: ["#main .ds-brand-block-carousel .cmp-teaser__title", "#main .ds-brand-block-carousel .cmp-teaser__description"] }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : [],
    transform3
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = {
      ...payload,
      template: PAGE_TEMPLATE
    };
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
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();

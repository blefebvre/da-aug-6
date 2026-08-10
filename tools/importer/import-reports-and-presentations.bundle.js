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

  // tools/importer/import-reports-and-presentations.js
  var import_reports_and_presentations_exports = {};
  __export(import_reports_and_presentations_exports, {
    default: () => import_reports_and_presentations_default
  });

  // tools/importer/parsers/cards-feature-reports.js
  function parse(element, { document }) {
    const teaserCards = Array.from(element.querySelectorAll(".teaser.ds-brand-teaser-card, .ds-brand-teaser-card"));
    if (teaserCards.length) {
      const cells2 = [];
      teaserCards.forEach((card) => {
        const image = card.querySelector(".cmp-teaser__image img, img");
        const title = card.querySelector(".cmp-teaser__title, h1, h2, h3, h4");
        const description = card.querySelector(".cmp-teaser__description");
        const ctaLinks = Array.from(card.querySelectorAll(".cmp-teaser__action-link, .cmp-teaser__action-container a"));
        const textCell = [];
        if (title) textCell.push(title);
        if (description) textCell.push(description);
        ctaLinks.forEach((a) => textCell.push(a));
        cells2.push([image || "", textCell]);
      });
      if (!cells2.length) {
        element.replaceWith(...element.childNodes);
        return;
      }
      const teaserBlock = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells: cells2 });
      element.replaceWith(teaserBlock);
      return;
    }
    const innerGrid = element.querySelector(".aem-Grid") || element;
    const cards = Array.from(innerGrid.children).filter((c) => c.querySelector && c.querySelector("h2"));
    const cells = [];
    cards.forEach((card) => {
      const image = [...card.querySelectorAll("img")].find((img) => !img.closest(".cmp-download")) || card.querySelector("img");
      const title = card.querySelector("h2, h1, h3");
      const textCell = [];
      if (title) {
        const h = document.createElement("h2");
        h.textContent = title.textContent.trim();
        textCell.push(h);
      }
      const seenText = /* @__PURE__ */ new Set();
      Array.from(card.querySelectorAll("p")).filter((p) => p.textContent.trim() && !p.querySelector("a") && !p.closest(".cmp-download")).forEach((p) => {
        const t = p.textContent.trim();
        if (seenText.has(t)) return;
        seenText.add(t);
        const para = document.createElement("p");
        para.textContent = t;
        textCell.push(para);
      });
      const seenLink = /* @__PURE__ */ new Set();
      const linkList = document.createElement("ul");
      const ctaParas = [];
      card.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        const text = a.textContent.trim();
        if (!href || !text) return;
        const key = `${text}|${href}`;
        if (seenLink.has(key)) return;
        seenLink.add(key);
        const link = document.createElement("a");
        link.setAttribute("href", href);
        link.textContent = text;
        if (a.closest(".cmp-button")) {
          const p = document.createElement("p");
          p.appendChild(link);
          ctaParas.push(p);
        } else {
          const li = document.createElement("li");
          li.appendChild(link);
          linkList.appendChild(li);
        }
      });
      if (linkList.children.length) textCell.push(linkList);
      ctaParas.forEach((p) => textCell.push(p));
      cells.push([image || "", textCell]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-feature", cells });
    element.replaceWith(block);
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

  // tools/importer/transformers/atlascopcogroup-hero-section.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function buildHeroMetadata(doc) {
    return WebImporter.Blocks.createBlock(doc, {
      name: "Section Metadata",
      cells: { style: "hero-light" }
    });
  }
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook2.beforeTransform) return;
    const doc = element.ownerDocument;
    const grid = element.querySelector("#main .ds-brand-container.grid-col-3") || element.querySelector(".ds-brand-container.grid-col-3");
    if (!grid) return;
    const h1 = element.querySelector("h1");
    if (!h1 || !(h1.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
    grid.parentNode.insertBefore(buildHeroMetadata(doc), grid);
    grid.parentNode.insertBefore(doc.createElement("hr"), grid);
  }

  // tools/importer/transformers/atlascopcogroup-reports-tabs.js
  var TransformHook3 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function buildQuarterBody(doc, item) {
    const parts = [];
    const dateEl = [...item.querySelectorAll("p, .cmp-text")].find((p) => /^Published on/i.test(p.textContent.trim()));
    if (dateEl) {
      const p = doc.createElement("p");
      p.textContent = dateEl.textContent.trim();
      parts.push(p);
    }
    const panelBody = item.querySelector(".cmp-accordion__panel") || item;
    const seen = /* @__PURE__ */ new Set();
    let currentUl = null;
    const flush = () => {
      if (currentUl && currentUl.children.length) parts.push(currentUl);
    };
    panelBody.querySelectorAll("h4, a[href]").forEach((node) => {
      if (node.tagName === "H4") {
        flush();
        const h4 = doc.createElement("h4");
        h4.textContent = node.textContent.trim();
        parts.push(h4);
        currentUl = doc.createElement("ul");
      } else {
        const href = node.getAttribute("href");
        const text = node.textContent.trim();
        if (!href || !text) return;
        const key = `${text}|${href}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (!currentUl) currentUl = doc.createElement("ul");
        const li = doc.createElement("li");
        const a = doc.createElement("a");
        a.setAttribute("href", href);
        a.textContent = text;
        li.appendChild(a);
        currentUl.appendChild(li);
      }
    });
    flush();
    return parts;
  }
  function buildTabMetadata(doc, label) {
    return WebImporter.Blocks.createBlock(doc, {
      name: "Section Metadata",
      cells: { tab: label, "tab-group": "overview", "tab-style": "dark" }
    });
  }
  function buildIntroMetadata(doc) {
    return WebImporter.Blocks.createBlock(doc, {
      name: "Section Metadata",
      cells: { "tab-intro": "true", "tab-group": "overview", "tab-style": "dark" }
    });
  }
  function transform3(hookName, element, payload) {
    if (hookName !== TransformHook3.beforeTransform) return;
    const doc = element.ownerDocument;
    const tabsRoot = element.querySelector(".cmp-tabs");
    if (!tabsRoot) return;
    const tablist = tabsRoot.querySelector('[role="tablist"]');
    const tabLabels = tablist ? [...tablist.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) : [];
    const panels = [...tabsRoot.querySelectorAll('[role="tabpanel"]')];
    if (!panels.length) return;
    const frag = doc.createDocumentFragment();
    const allHeadings = [...element.querySelectorAll("h1, h2, h3")];
    const introHeading = allHeadings.filter((h) => h.compareDocumentPosition(tabsRoot) & Node.DOCUMENT_POSITION_FOLLOWING).pop() || null;
    frag.appendChild(doc.createElement("hr"));
    if (introHeading) {
      const h2 = doc.createElement("h2");
      h2.textContent = introHeading.textContent.trim();
      frag.appendChild(h2);
      introHeading.remove();
    } else {
      const h2 = doc.createElement("h2");
      h2.textContent = "Overview of documents";
      frag.appendChild(h2);
    }
    frag.appendChild(buildIntroMetadata(doc));
    panels.forEach((panel, i) => {
      const label = tabLabels[i] || `Tab ${i + 1}`;
      frag.appendChild(doc.createElement("hr"));
      const items = [...panel.querySelectorAll(".cmp-accordion__item")];
      if (items.length) {
        const rows = [];
        items.forEach((item) => {
          const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__button, [class*="title"], h3');
          const quarterLabel = titleEl ? titleEl.textContent.trim() : "";
          if (!quarterLabel) return;
          const btn = item.querySelector(".cmp-accordion__button");
          const expanded = item.hasAttribute("data-cmp-expanded") || !!item.querySelector(".cmp-accordion__button--expanded") || btn && btn.getAttribute("aria-expanded") === "true";
          const body = buildQuarterBody(doc, item);
          rows.push([quarterLabel, expanded ? "expanded" : "", body]);
        });
        if (rows.length) {
          const accordion = WebImporter.Blocks.createBlock(doc, { name: "accordion", cells: rows });
          frag.appendChild(accordion);
        }
      } else {
        while (panel.firstChild) frag.appendChild(panel.firstChild);
      }
      frag.appendChild(buildTabMetadata(doc, label));
    });
    frag.appendChild(doc.createElement("hr"));
    tabsRoot.replaceWith(frag);
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
  function toAbsoluteHttps(url) {
    if (url.startsWith("//")) return `https:${url}`;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/is/image/")) return `https://atlascopco.scene7.com${url}`;
    return url;
  }
  function transform4(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const doc = element.ownerDocument;
    element.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!detectDynamicMediaUrl(src)) return;
      const alt = img.getAttribute("alt") || "";
      const absSrc = toAbsoluteHttps(src);
      const linkedAnchor = findLinkedDmCarrier(img);
      if (linkedAnchor) {
        linkedAnchor.setAttribute("title", absSrc);
        linkedAnchor.textContent = altToLinkText(alt);
        return;
      }
      const parent = img.parentElement;
      if (parent && parent.tagName === "A") {
        console.warn("DM image inside mixed-content anchor, skipped:", src);
        return;
      }
      const a = doc.createElement("a");
      a.setAttribute("href", absSrc);
      a.textContent = altToLinkText(alt);
      img.replaceWith(a);
    });
  }

  // tools/importer/transformers/atlascopcogroup-metadata-image.js
  var TransformHook4 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  var OG_IMAGE_WIDTH = 1200;
  function isScene7(url) {
    try {
      return new URL(url, "https://x/").pathname.startsWith("/is/image/");
    } catch {
      return false;
    }
  }
  function boundScene7(url) {
    const normalized = url.startsWith("//") ? `https:${url}` : url;
    const qIdx = normalized.indexOf("?");
    const base = qIdx >= 0 ? normalized.slice(0, qIdx) : normalized;
    const params = (qIdx >= 0 ? normalized.slice(qIdx + 1) : "").split("&").filter((p) => p && !/^wid=/.test(p) && !/^fmt=/.test(p));
    params.push(`wid=${OG_IMAGE_WIDTH}`, "fmt=jpg");
    return `${base}?${params.join("&")}`;
  }
  function transform5(hookName, element, payload) {
    if (hookName !== TransformHook4.afterTransform) return;
    const tables = [...element.querySelectorAll("table")].filter((t) => {
      const first = t.querySelector("th, td");
      return first && first.textContent.trim().toLowerCase() === "metadata";
    });
    tables.forEach((table) => {
      [...table.querySelectorAll("tr")].forEach((row) => {
        const cells = [...row.children];
        if (cells.length < 2) return;
        if (cells[0].textContent.trim().toLowerCase() !== "image") return;
        const img = cells[1].querySelector("img");
        const src = img && (img.getAttribute("src") || "");
        if (!src) {
          row.remove();
          return;
        }
        if (isScene7(src)) {
          img.setAttribute("src", boundScene7(src));
          return;
        }
        console.warn("Dropping oversized/unbounded metadata image:", src);
        row.remove();
      });
    });
  }

  // tools/importer/import-reports-and-presentations.js
  var parsers = {
    "cards-feature": parse
  };
  var PAGE_TEMPLATE = {
    name: "reports-and-presentations",
    description: 'Investor reports and presentations: hero, three featured document blocks, an "Overview of documents" year-tabs widget (section-based tabs), and a related-links cards row',
    urls: [
      "https://www.atlascopcogroup.com/en/investors/reports-and-presentations"
    ],
    blocks: [
      {
        name: "cards-feature",
        // Two 3-card grids become cards-feature blocks (the shared parser detects
        // each shape): the featured document row (`.ds-brand-container.grid-col-3`,
        // h2 + document <ul>), and the bottom "You might also be interested in"
        // row (`.grid-col-3.teaser-line-clamp-3`, standard teaser cards). The H2
        // heading that precedes the interest grid is a sibling, so it survives as
        // default content above the block.
        instances: [
          "#main .ds-brand-container.grid-col-3",
          "#main .grid-col-3.teaser-line-clamp-3"
        ]
      }
    ],
    // Both cards rows are styled blocks; everything else is default content. The
    // tabs transformer emits its own tab sections + breaks.
    sections: []
  };
  var transformers = [
    transform,
    transform2,
    transform3,
    transform4
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
  var import_reports_and_presentations_default = {
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
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      try {
        transform5("afterTransform", main, { ...payload, template: PAGE_TEMPLATE });
      } catch (e) {
        console.error("metadata-image transformer failed:", e);
      }
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
  return __toCommonJS(import_reports_and_presentations_exports);
})();

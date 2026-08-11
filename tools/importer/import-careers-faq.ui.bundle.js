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

// tools/importer/transformers/atlascopcogroup-faq-tabs.js
var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
function buildFaqBody(doc, item) {
  const panel = item.querySelector(".cmp-accordion__panel") || item;
  const parts = [];
  const paras = [...panel.querySelectorAll(".cmp-text p, p")];
  const seen = /* @__PURE__ */ new Set();
  paras.forEach((p) => {
    const text = p.textContent.trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    const out = doc.createElement("p");
    p.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        out.appendChild(doc.createTextNode(node.textContent));
      } else if (node.tagName === "A") {
        const href = node.getAttribute("href");
        const a = doc.createElement("a");
        if (href) a.setAttribute("href", href);
        a.textContent = node.textContent;
        out.appendChild(a);
      } else {
        out.appendChild(doc.createTextNode(node.textContent));
      }
    });
    parts.push(out);
  });
  if (!parts.length && panel.textContent.trim()) {
    const p = doc.createElement("p");
    p.textContent = panel.textContent.trim();
    parts.push(p);
  }
  return parts;
}
function buildTabMetadata(doc, label) {
  return WebImporter.Blocks.createBlock(doc, {
    name: "Section Metadata",
    cells: { tab: label, "tab-group": "faq", "tab-style": "light" }
  });
}
function transform2(hookName, element, payload) {
  if (hookName !== TransformHook2.beforeTransform) return;
  const doc = element.ownerDocument;
  const tabsRoot = element.querySelector(".cmp-tabs");
  if (!tabsRoot) return;
  const tablist = tabsRoot.querySelector('[role="tablist"]');
  const tabLabels = tablist ? [...tablist.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()) : [];
  const panels = [...tabsRoot.querySelectorAll('[role="tabpanel"]')];
  if (!panels.length) return;
  const frag = doc.createDocumentFragment();
  panels.forEach((panel, i) => {
    const label = tabLabels[i] || `Tab ${i + 1}`;
    frag.appendChild(doc.createElement("hr"));
    const items = [...panel.querySelectorAll(".cmp-accordion__item")];
    if (items.length) {
      const rows = [];
      items.forEach((item) => {
        const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__button, [class*="title"], h2, h3');
        const question = titleEl ? titleEl.textContent.trim() : "";
        if (!question) return;
        const btn = item.querySelector(".cmp-accordion__button");
        const expanded = item.hasAttribute("data-cmp-expanded") || !!item.querySelector(".cmp-accordion__button--expanded") || btn && btn.getAttribute("aria-expanded") === "true";
        const body = buildFaqBody(doc, item);
        rows.push([question, expanded ? "expanded" : "", body]);
      });
      if (rows.length) {
        const accordion = WebImporter.Blocks.createBlock(doc, { name: "accordion (large)", cells: rows });
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
function transform3(hookName, element, payload) {
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
var TransformHook3 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
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
function transform4(hookName, element, payload) {
  if (hookName !== TransformHook3.afterTransform) return;
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

// tools/importer/transformers/atlascopcogroup-breadcrumb.js
var TransformHook4 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
function encodeTrail(pairs) {
  return pairs.map(({ path, label }) => `${path}::${label}`).join("|");
}
function transform5(hookName, element, payload) {
  if (hookName !== TransformHook4.afterTransform) return;
  const doc = element.ownerDocument;
  const items = [...element.querySelectorAll(".cmp-breadcrumb__item")];
  const pairs = [];
  items.forEach((li) => {
    const a = li.querySelector("a[href]");
    if (!a) return;
    const path = a.getAttribute("href").trim();
    const label = (a.querySelector('[itemprop="name"]') || a).textContent.trim();
    if (path && label) pairs.push({ path, label });
  });
  if (pairs.length) {
    const tables = [...element.querySelectorAll("table")].filter((t) => {
      const first = t.querySelector("th, td");
      return first && first.textContent.trim().toLowerCase() === "metadata";
    });
    tables.forEach((table) => {
      const has = [...table.querySelectorAll("tr")].some((r) => {
        const c = r.children[0];
        return c && c.textContent.trim().toLowerCase() === "breadcrumb";
      });
      if (has) return;
      const tr = doc.createElement("tr");
      const keyTd = doc.createElement("td");
      keyTd.textContent = "breadcrumb";
      const valTd = doc.createElement("td");
      valTd.textContent = encodeTrail(pairs);
      tr.append(keyTd, valTd);
      table.appendChild(tr);
    });
  }
  WebImporter.DOMUtils.remove(element, [
    ".breadcrumb.cmp-breadcrumb--bar",
    ".cmp-breadcrumb"
  ]);
}

// tools/importer/import-careers-faq.js
var parsers = {
  "hero-banner": parse
};
var PAGE_TEMPLATE = {
  name: "careers-faq",
  description: 'Careers "Frequently asked questions": a full-bleed photographic hero (hero-banner) over a light-grey section-based tabs widget (3 tabs) of collapsible FAQ accordions',
  urls: [
    "https://www.atlascopcogroup.com/en/careers/jobs/frequently-asked-questions"
  ],
  blocks: [
    {
      name: "hero-banner",
      // The top-of-page full-bleed photographic hero (ds-brand-hero-large-banner).
      instances: ["#main .teaser.ds-brand-hero-large-banner"]
    }
  ],
  // The tabs widget is emitted by the faq-tabs transformer (flattens .cmp-tabs
  // into per-tab | tab | sections); everything else is default content.
  sections: []
};
var transformers = [
  transform,
  transform2,
  transform3
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
var import_careers_faq_default = {
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
      transform4("afterTransform", main, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error("metadata-image transformer failed:", e);
    }
    try {
      transform5("afterTransform", main, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error("breadcrumb transformer failed:", e);
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
export {
  import_careers_faq_default as default
};

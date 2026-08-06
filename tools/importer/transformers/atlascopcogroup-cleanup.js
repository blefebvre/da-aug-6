/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Atlas Copco Group site-wide cleanup.
 *
 * Removes non-authorable site chrome and injected widgets so the import
 * contains only page-level authorable content (everything inside #main).
 *
 * ALL selectors below were verified against migration-work/cleaned.html
 * (the captured DOM of https://www.atlascopcogroup.com/en). The validator
 * runs this transformer against the LIVE URL with `element` === document.body,
 * so the header/footer/OneTrust/locator/scripts that live outside #main are
 * all in scope and removable here.
 *
 * A feedback/survey widget is injected client-side (absent from cleaned.html):
 * it renders "How would you rate your experience with this website?" at the end
 * of the page, plus a Facebook SDK root. Removed in beforeTransform below via
 * DOM-verified selectors observed on the live page skeleton (survey container id
 * is dynamic per-page, so matched by prefix; plus #fb-root and the show-survey
 * "Feedback" button). No Medallia container is present on the live page, so no
 * Medallia selector is invented — per the DOM-based-selectors-only rule.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie / consent (OneTrust) — overlays and dialogs that block parsing.
    // Verified in cleaned.html: #onetrust-consent-sdk (wraps #onetrust-banner-sdk
    // and #onetrust-pc-sdk), the floating #ot-sdk-btn cookie-settings button,
    // the .ot-sdk-show-settings link, the .onetrust-pc-dark-filter overlay, and
    // the <iframe class="ot-text-resize"> helper.
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '#ot-sdk-btn',
      '.ot-sdk-show-settings',
      '.onetrust-pc-dark-filter',
      'iframe.ot-text-resize',
    ]);

    // Location-redirect banner (country/language locator). Verified in
    // cleaned.html: .ds-brand-locator wrapper + #locator-config config node.
    // It is presented as a dismissible redirect prompt, not page content.
    WebImporter.DOMUtils.remove(element, [
      '.ds-brand-locator',
      '#locator-config',
      '#ds-brand-locator-continue-button',
      '#ds-brand-locator-close-button',
    ]);

    // Feedback / survey widget — injected client-side (absent from cleaned.html),
    // it leaked into the imported content as "How would you rate your experience
    // with this website?" at the end of the page. Removed before parsing so it
    // never reaches the block parsers. Selectors verified on the live page:
    //  - [id^="survey_"]: survey widget container (id is dynamic per-page, e.g.
    //    #survey_1594100 — matched by prefix);
    //  - #fb-root: Facebook SDK root injected alongside the widget;
    //  - button[aria-label*="Feedback" i]: the show-survey "Feedback" button.
    WebImporter.DOMUtils.remove(element, [
      '[id^="survey_"]',
      '#fb-root',
      'button[aria-label*="Feedback" i]',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global chrome. Verified in cleaned.html:
    //  - header.ds-brand-header (site header: contains main nav, mega-menu,
    //    language switcher, search/algolia box, skip-content button, header overlay)
    //  - footer.ds-brand-footer (site footer)
    // Removing the header/footer roots removes all of their descendant chrome.
    WebImporter.DOMUtils.remove(element, [
      'header.ds-brand-header',
      'footer.ds-brand-footer',
      'header',
      'footer',
    ]);

    // Belt-and-suspenders for header-scoped chrome in case a live-page variant
    // renders any of these outside the <header> root. All verified in cleaned.html.
    WebImporter.DOMUtils.remove(element, [
      '.ds-brand-mega-menu',
      '.ds-brand-main-navigation',
      '.ds-brand-language-switcher',
      '.ds-brand-header__overlay',
      '.search-box.search-widget',
      '.algolia-box',
      '.ds-brand-skip-content-button',
    ]);

    // Injected/analytics/non-content elements that carry no authorable value.
    // The live page (which the validator loads) serves these even though the
    // scraper stripped them from cleaned.html.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'noscript',
      'link',
      'style',
      'iframe',
      'template',
    ]);

    // Strip analytics/tracking attributes seen in the captured DOM
    // (data-tms-scrolltracking* live on <body>; data-cmp-link-accessibility-*
    // are decoration hints). Safe no-op where absent.
    const trackingAttrs = [
      'data-tms-scrolltracking',
      'data-tms-scrolltracking-tracked',
      'data-cmp-link-accessibility-enabled',
      'data-cmp-link-accessibility-text',
      'onclick',
    ];
    trackingAttrs.forEach((attr) => {
      if (element.hasAttribute && element.hasAttribute(attr)) element.removeAttribute(attr);
    });
    element.querySelectorAll('[data-tms-scrolltracking], [data-tms-scrolltracking-tracked], [data-cmp-link-accessibility-enabled], [data-cmp-link-accessibility-text], [onclick]').forEach((el) => {
      trackingAttrs.forEach((attr) => el.removeAttribute(attr));
    });
  }
}

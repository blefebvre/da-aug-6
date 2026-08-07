import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Close every open mega-menu panel and the language menu.
 * @param {Element} nav
 */
function closeAllPanels(nav) {
  nav.querySelectorAll('.nav-primary > li.nav-open').forEach((li) => {
    li.classList.remove('nav-open');
    const trigger = li.querySelector('.nav-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
  const lang = nav.querySelector('.nav-lang');
  if (lang) {
    lang.classList.remove('nav-open');
    const t = lang.querySelector('.nav-lang-trigger');
    if (t) t.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Open a single mega-menu panel, closing any others first.
 * @param {Element} li the nav-sections top-level list item
 * @param {Element} nav
 */
function openPanel(li, nav) {
  closeAllPanels(nav);
  li.classList.add('nav-open');
  const trigger = li.querySelector('.nav-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
}

/**
 * Convert a top-level list item that has a child <ul> into a mega-menu: the
 * label becomes a <button> trigger (keyboard + hover accessible) and the child
 * <ul> is wrapped in a panel with a "Close menu" button. Items without a child
 * <ul> stay as plain links. Generic — driven entirely by the nav DOM.
 * @param {Element} li
 * @param {Element} nav
 */
function decorateMegaMenu(li, nav) {
  // The nav fragment renders one way locally (link is a direct child of <li>)
  // and another when served from DA/EDS (each link wrapped in a <p>). Accept
  // both so the trigger is always found.
  const link = li.querySelector(':scope > a, :scope > p > a');
  const panelList = li.querySelector(':scope > ul');
  if (!link || !panelList) return; // plain link, no panel

  const label = link.textContent.trim();
  const href = link.getAttribute('href') || '#';

  // Split-link pattern (matches source + the mobile spec): a navigable <a> label
  // plus an adjacent <button> that opens the mega-menu panel. The section URL is
  // always reachable; the panel is keyboard-accessible via the button.
  const navLink = document.createElement('a');
  navLink.className = 'nav-link';
  navLink.href = href;
  navLink.textContent = label;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-trigger';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', `${label} menu`);
  trigger.innerHTML = '<span class="nav-caret" aria-hidden="true"></span>';

  const panel = document.createElement('div');
  panel.className = 'nav-megamenu';
  const inner = document.createElement('div');
  inner.className = 'nav-megamenu-inner';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'nav-megamenu-close';
  // Desktop shows "Close menu"; mobile shows "Back to <section>". Both labels
  // are present; CSS reveals the right one per breakpoint.
  closeBtn.innerHTML = `<span class="nav-close-desktop">Close menu</span><span class="nav-close-mobile">Back to ${label}</span>`;
  closeBtn.addEventListener('click', () => {
    li.classList.remove('nav-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.dataset.suppressFocusOpen = 'true';
    trigger.focus();
    delete trigger.dataset.suppressFocusOpen;
  });

  inner.append(closeBtn, panelList);
  panel.append(inner);

  li.textContent = '';
  li.append(navLink, trigger, panel);

  // Desktop: hovering the row (or focusing either control) reveals the panel;
  // the chevron button toggles it; the label link navigates.
  li.addEventListener('mouseenter', () => { if (isDesktop.matches) openPanel(li, nav); });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) {
      li.classList.remove('nav-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
  navLink.addEventListener('focus', () => {
    if (isDesktop.matches) openPanel(li, nav);
  });
  trigger.addEventListener('focus', () => {
    if (trigger.dataset.suppressFocusOpen === 'true') return;
    if (isDesktop.matches) openPanel(li, nav);
  });
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    const open = li.classList.contains('nav-open');
    if (open) {
      li.classList.remove('nav-open');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      openPanel(li, nav);
    }
  });
}

/**
 * Build the language selector button + menu from the tools section list.
 * @param {Element} navTools
 */
function decorateLanguage(navTools) {
  const list = navTools.querySelector('ul');
  if (!list) return;
  const current = list.querySelector('li a');
  const label = current ? current.textContent.trim() : 'English';

  const wrap = document.createElement('div');
  wrap.className = 'nav-lang';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'nav-lang-trigger';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.textContent = label;

  const menu = document.createElement('ul');
  menu.className = 'nav-lang-menu';
  [...list.children].forEach((liEl) => menu.append(liEl));

  trigger.addEventListener('click', () => {
    const open = wrap.classList.toggle('nav-open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  wrap.append(trigger, menu);
  list.replaceWith(wrap);
}

/**
 * Toggle the mobile drawer open/closed.
 * @param {Element} nav
 * @param {boolean} [force]
 */
function toggleMobileMenu(nav, force) {
  const open = force !== undefined ? force : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    const label = button.querySelector('.nav-hamburger-label');
    if (label) label.textContent = open ? 'Close' : 'Menu';
  }
  // When closing the drawer, also collapse any open sub-panels.
  if (!open) {
    nav.querySelectorAll('.nav-primary > li.nav-open').forEach((li) => {
      li.classList.remove('nav-open');
      const t = li.querySelector('.nav-trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav fragment. The nav doc is served at the site root as /nav.plain.html
  // on BOTH the local dev server and the aem.page/aem.live preview+live tiers,
  // so try the metadata-configured path (default /nav) first. Only fall back to
  // the /content-prefixed path for local setups that nest content there.
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  let fragment = await loadFragment(navPath);
  if (!fragment) fragment = await loadFragment('/content/nav');

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Normalize DOM shape: when served from DA/EDS, each list link is wrapped in
  // a <p> (markdown paragraph). Locally the link is a direct child of <li>.
  // Unwrap any <li> > <p> that contains only a single link so downstream
  // selectors (and the desktop/mobile builders) see one consistent structure.
  nav.querySelectorAll('li > p').forEach((p) => {
    if (p.children.length === 1 && p.firstElementChild.tagName === 'A'
      && p.textContent.trim() === p.firstElementChild.textContent.trim()) {
      p.replaceWith(p.firstElementChild);
    }
  });

  // label the three fragment sections
  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // brand: strip the button decoration EDS applies to a sole link
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('a');
    if (brandLink) {
      brandLink.className = '';
      if (brandLink.parentElement) brandLink.parentElement.className = 'nav-brand-link-wrapper';
    }
  }

  // primary nav: the fragment wraps the list in a .default-content-wrapper, so
  // grab the first <ul> regardless of wrapper depth and tag it for styling.
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    const primaryList = navSections.querySelector('ul');
    if (primaryList) {
      primaryList.classList.add('nav-primary');
      [...primaryList.children].forEach((li) => decorateMegaMenu(li, nav));
    }
  }

  // tools: Locations link + language selector
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    // The fragment nests both items inside a .default-content-wrapper (and wraps
    // the Locations link in its own <p>). Hoist everything to be a direct child
    // of .nav-tools and drop the wrapping <p> so the flex row lays Locations and
    // the language selector out inline (they otherwise stack as block elements).
    const wrapper = navTools.querySelector('.default-content-wrapper');
    if (wrapper) {
      while (wrapper.firstElementChild) navTools.append(wrapper.firstElementChild);
      wrapper.remove();
    }
    const locations = navTools.querySelector('a');
    if (locations) {
      locations.classList.add('nav-locations');
      const p = locations.closest('p');
      if (p && p.parentElement === navTools) p.replaceWith(locations);
    }
    decorateLanguage(navTools);
  }

  // mobile "Menu" trigger (visible-text label per source)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = '<button type="button" aria-controls="nav" aria-expanded="false"><span class="nav-hamburger-label">Menu</span></button>';
  hamburger.querySelector('button').addEventListener('click', () => toggleMobileMenu(nav));
  nav.append(hamburger);

  // close panels on Escape
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      const openPanelEl = nav.querySelector('.nav-primary > li.nav-open');
      closeAllPanels(nav);
      if (openPanelEl) {
        const t = openPanelEl.querySelector('.nav-trigger');
        if (t) t.focus();
      }
      if (!isDesktop.matches) toggleMobileMenu(nav, false);
    }
  });

  // close panels when a click lands outside the header
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) closeAllPanels(nav); });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // The bar is a solid teal sticky element at all scroll positions (handled in
  // CSS via `position: sticky`), so no scroll observer is needed here.

  // reset state cleanly when crossing the desktop/mobile breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    toggleMobileMenu(nav, false);
  });
}

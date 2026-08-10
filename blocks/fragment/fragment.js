/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // Reset base path for media to the fragment's base. A fragment fetched
      // for a deep page (e.g. /content/en/investors/x) still carries media URLs
      // relative to the FRAGMENT's own location, not the current page — without
      // rebasing, `images/logo.png` in /content/footer resolves against the
      // page path and 404s. Rebase both the DA-published `./media_*` form and
      // the local relative `images/*` form against the fragment path.
      const fragmentBase = new URL(path, window.location);
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}]`).forEach((elem) => {
          const val = elem.getAttribute(attr) || '';
          if (/^(\.\/media_|\.?\/?images\/)/.test(val)) {
            elem[attr] = new URL(val, fragmentBase).href;
          }
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (!fragment) return;

  const wrapper = block.closest('.fragment-wrapper');
  const section = wrapper.closest('.section');

  if (section && section.children.length === 1) {
    // fragment is the ONLY child of its section; replace the whole section
    section.replaceWith(...fragment.childNodes);
  } else {
    // fragment shares section with other children; flatten children into it
    fragment.querySelectorAll(':scope > .section').forEach((fragSection) => {
      [...fragSection.childNodes].forEach((child) => wrapper.before(child));
    });
    wrapper.remove();
  }
}

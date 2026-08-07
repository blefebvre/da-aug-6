import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // Load the footer fragment. The migrated content lives under /content locally
  // (and at the DA root once published), so try /content/footer first and fall
  // back to the configured/root path. Trying /content first avoids picking up
  // the backend's default boilerplate footer that is still served at the root.
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  let fragment = await loadFragment('/content/footer');
  if (!fragment) fragment = await loadFragment(footerPath);

  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // Label the five fragment sections for styling.
  const sectionClasses = ['footer-brand', 'footer-links', 'footer-links', 'footer-about', 'footer-legal'];
  [...footer.children].forEach((section, i) => {
    if (sectionClasses[i]) section.classList.add(sectionClasses[i]);
  });

  // The About section's list is the social-icon row.
  const about = footer.querySelector('.footer-about');
  if (about) {
    const socialList = about.querySelector('ul');
    if (socialList) socialList.classList.add('footer-social');
  }

  // Wire the "Manage cookies" link to the consent mechanism instead of
  // navigating. Match on the visible label (and the #consent href when present):
  // Document Authoring rewrites a fragment-only href like "#consent" to "/" on
  // publish, so keying solely on the href is unreliable. Emits a custom event,
  // and triggers OneTrust's preference center if that global is present.
  const legal = footer.querySelector('.footer-legal') || footer;
  const consentLink = [...legal.querySelectorAll('a')].find(
    (a) => a.getAttribute('href') === '#consent'
      || /manage cookies/i.test(a.textContent.trim()),
  );
  if (consentLink) {
    consentLink.classList.add('footer-manage-cookies');
    consentLink.setAttribute('href', '#consent');
    consentLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.OneTrust && typeof window.OneTrust.ToggleInfoDisplay === 'function') {
        window.OneTrust.ToggleInfoDisplay();
      }
      document.dispatchEvent(new CustomEvent('manage-cookies'));
    });
  }

  block.append(footer);
}

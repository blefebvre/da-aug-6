/**
 * Section Metadata block.
 *
 * The standard AEM boilerplate consumes "Section Metadata" natively inside
 * decorateSections() in aem.js. This project runs a reduced aem.js fork that
 * does not, so the imported `section-metadata` table would otherwise render as
 * visible "style / <value>" text and 404 on a missing block module.
 *
 * This block reads each key/value row (e.g. `style | dark`) and applies it to
 * the parent section: the `style` value(s) become CSS classes on the section
 * (space-separated values → multiple classes) and are also exposed via
 * `data-section-style`, then the block removes itself from the DOM so no raw
 * metadata text is shown. Any other key is stored as a `data-*` attribute.
 *
 * @param {Element} block The section-metadata block element
 */
export default function decorate(block) {
  const section = block.closest('.section');
  const config = {};

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (key) config[key] = value;
  });

  if (section) {
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'style') {
        value.split(',').map((s) => s.trim()).filter(Boolean).forEach((styleName) => {
          const className = styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          if (className) section.classList.add(className);
        });
        section.dataset.sectionStyle = value;
      } else {
        // Assign via the camelCase form: DOMStringMap setters reject hyphenated
        // property names (`dataset['tab-group']` throws), so a key like
        // "tab-group" must be written as `dataset.tabGroup` (→ data-tab-group).
        const camelKey = key
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
        if (camelKey) section.dataset[camelKey] = value;
      }
    });
  }

  block.remove();
}

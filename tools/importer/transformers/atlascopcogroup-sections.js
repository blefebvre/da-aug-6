/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Atlas Copco Group section breaks + section metadata.
 *
 * Driven entirely by payload.template.sections (from page-templates.json) so it
 * stays template-agnostic. For each section it:
 *   - inserts an <hr> section break before the section element (every section
 *     except the first), producing sections.length - 1 breaks;
 *   - when the section has a `style`, appends a "Section Metadata" block
 *     (style: <value>) right after the section element so the style attaches to
 *     the section it configures.
 *
 * homepage template sections (10): s4 style=dark, s7 style=extra-dark,
 * s10 style=gold → 3 Section Metadata blocks, 9 section breaks expected.
 *
 * Selectors come from template.sections[].selector, each verified unique within
 * #main of migration-work/cleaned.html. Runs in beforeTransform only: these are
 * single-block sections whose selectors point at the SAME elements the block
 * parsers replace via element.replaceWith(). If this ran in afterTransform those
 * elements would already be gone (7 of 10 selectors matched no element, dropping
 * the s10 'gold' metadata and merging logical sections). In beforeTransform the
 * original DOM is intact — only the cleanup transformer's beforeTransform (which
 * runs first in the transformers array) has removed OneTrust/locator — so all 10
 * selectors match. The <hr> and section-metadata nodes are inserted as siblings
 * of each section element; when parsers later call element.replaceWith(block) the
 * block lands in the same position and the inserted markers survive.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  const template = payload && payload.template;
  const sections = template && template.sections;
  if (!sections || !Array.isArray(sections) || sections.length < 2) return;

  const doc = element.ownerDocument;

  // Process in reverse so earlier inserts don't shift the DOM positions of
  // sections we have not handled yet.
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const section = sections[i];
    if (!section || !section.selector) continue;

    const sectionEl = element.querySelector(section.selector);
    if (!sectionEl) {
      // eslint-disable-next-line no-console
      console.warn('Section selector matched no element, skipping:', section.selector);
      continue;
    }

    // Section Metadata block for styled sections. createBlock builds a table
    // whose first cell (th) reads "Section Metadata"; the value row is style|<v>.
    // Insert immediately AFTER the section element so it belongs to this section.
    if (section.style) {
      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      if (sectionEl.nextSibling) {
        sectionEl.parentNode.insertBefore(metadataBlock, sectionEl.nextSibling);
      } else {
        sectionEl.parentNode.appendChild(metadataBlock);
      }
    }

    // Section break before every section except the first.
    if (i > 0) {
      const hr = doc.createElement('hr');
      sectionEl.parentNode.insertBefore(hr, sectionEl);
    }
  }
}

/*
 * Section-based tabs.
 *
 * Any run of consecutive sections that each carry a `tab` value in their
 * Section Metadata (authored as `| tab | <label> |`) is grouped into a single
 * tabbed widget: one tab button per section, showing that section as its panel.
 *
 * Authoring contract (per tab section):
 *   ...section content...
 *   | Section Metadata |
 *   | tab | 2026 |
 *
 * Optional `| tab-group | <id> |` forces which widget a section belongs to, so
 * two independent tab sets on one page don't merge even if adjacent.
 *
 * IMPORTANT — runs EAGERLY, during decorateMain(), before the page is revealed.
 * It reads the tab label straight from the section's Section Metadata table
 * (it does NOT wait for the section-metadata block to decorate and set
 * `data-tab`). Grouping before paint avoids a flash where the tab sections
 * render stacked inline. Sections without a `tab` value are untouched, so this
 * is a no-op on pages that don't use it (e.g. the homepage).
 */

// Fires as soon as this module is imported/evaluated. If you DON'T see this in
// the console, the browser is running a stale scripts.js that predates this
// module (hard-reload with cache disabled). See SECTION_TABS_VERSION below.
// eslint-disable-next-line no-console
console.log('[section-tabs] module loaded');

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Read a section's Section Metadata table into a key→value map. Keys are
 * lower-cased; values are trimmed text. Returns {} when there's no metadata.
 * This mirrors what the section-metadata block reads, but runs independently so
 * tab grouping does not depend on that block having decorated yet.
 * @param {Element} section
 */
function readSectionMetadata(section) {
  const config = {};
  const block = section.querySelector(':scope > .section-metadata, :scope > div > .section-metadata');
  if (!block) return config;
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (key) config[key] = value;
  });
  return config;
}

/**
 * Build one tabs widget from an array of adjacent tab sections.
 * @param {Element[]} sections tab sections in document order
 * @param {string[]} labels matching tab labels
 * @param {number} widgetIndex index of this widget on the page (for unique ids)
 */
function buildTabsWidget(sections, labels, widgetIndex) {
  if (sections.length < 2) return; // a lone tab section isn't a tabbed widget

  const first = sections[0];
  const wrapper = document.createElement('div');
  wrapper.className = 'section-tabs';

  const tablist = document.createElement('div');
  tablist.className = 'section-tabs-list';
  tablist.setAttribute('role', 'tablist');

  first.parentElement.insertBefore(wrapper, first);
  wrapper.append(tablist);

  sections.forEach((section, i) => {
    const label = labels[i] || `Tab ${i + 1}`;
    const idBase = `section-tab-${widgetIndex}-${slug(label) || i}`;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'section-tabs-tab';
    tab.id = `${idBase}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${idBase}-panel`);
    tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.textContent = label;
    tablist.append(tab);

    section.classList.add('section-tabs-panel');
    section.id = `${idBase}-panel`;
    section.setAttribute('role', 'tabpanel');
    section.setAttribute('aria-labelledby', `${idBase}-tab`);
    section.hidden = i !== 0;
    wrapper.append(section);
  });

  const tabs = [...tablist.children];
  const panels = [...wrapper.querySelectorAll(':scope > .section-tabs-panel')];

  const activate = (index, focus = true) => {
    tabs.forEach((t, i) => {
      const selected = i === index;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    });
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i, false));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        activate(next);
      }
    });
  });
}

/**
 * Find runs of adjacent tab sections in <main> and turn each run into a tabs
 * widget. A run breaks when a non-tab section (or a different tab-group)
 * intervenes.
 * @param {Element} main
 */
// Bump this string whenever section-tabs.js changes so we can tell from the
// browser console exactly which build is running (rules out stale/cached JS).
const SECTION_TABS_VERSION = 'section-tabs v3 (eager, reads metadata table)';

export default function buildSectionTabs(main) {
  // eslint-disable-next-line no-console
  console.log(`[section-tabs] buildSectionTabs() called — ${SECTION_TABS_VERSION}`);
  if (!main) {
    // eslint-disable-next-line no-console
    console.warn('[section-tabs] no <main> element — aborting');
    return;
  }
  const sections = [...main.querySelectorAll(':scope > .section')];
  const tabbed = sections.filter((s) => readSectionMetadata(s).tab);
  // eslint-disable-next-line no-console
  console.log(`[section-tabs] scanned ${sections.length} sections, ${tabbed.length} carry a "tab" metadata value`);
  const runs = [];
  let run = null;

  sections.forEach((section) => {
    const meta = readSectionMetadata(section);
    const label = meta.tab;
    const group = meta['tab-group'] || '';
    if (label) {
      if (run && run.group === group && run.lastEl === section.previousElementSibling) {
        run.items.push(section);
        run.labels.push(label);
      } else {
        run = {
          group, items: [section], labels: [label], lastEl: null,
        };
        runs.push(run);
      }
      run.lastEl = section;
    } else {
      run = null;
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[section-tabs] built ${runs.length} tab widget(s): ${runs.map((r) => `[${r.labels.join(', ')}]`).join(' ') || '(none)'}`);
  runs.forEach((r, i) => buildTabsWidget(r.items, r.labels, i));
}

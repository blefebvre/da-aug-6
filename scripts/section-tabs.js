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
 * Optional metadata keys (all read straight from the Section Metadata table):
 *   | tab-group | <id> |  — forces which widget a section joins, so two
 *                           independent tab sets on one page don't merge.
 *   | tab-intro | true |   — marks a heading section that renders ABOVE the
 *                           tablist (the widget's title), not as a tab/panel.
 *   | tab-style | dark |   — paints the whole widget (heading + tablist +
 *                           panels) as one full-bleed teal band (white text).
 *   | tab-style | light |  — full-bleed light grey (rgb(243,246,247)) band,
 *                           dark text (careers FAQ). Absent → plain in-column
 *                           widget, no band.
 *
 * IMPORTANT — runs EAGERLY, during decorateMain(), before the page is revealed.
 * It reads the tab label straight from the section's Section Metadata table
 * (it does NOT wait for the section-metadata block to decorate and set
 * `data-tab`). Grouping before paint avoids a flash where the tab sections
 * render stacked inline. Sections without a `tab` value are untouched, so this
 * is a no-op on pages that don't use it (e.g. the homepage).
 */

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Read a section's Section Metadata into a key→value map (`tab`, `tab-group`,
 * `tab-intro`, `tab-style`). Order-INDEPENDENT: it works whether or not the
 * section-metadata block has decorated yet, because it reads from BOTH sources.
 *
 * Why both: blocks/section-metadata/section-metadata.js promotes each metadata
 * key onto the section as a camelCase `data-*` attribute and then REMOVES itself
 * from the DOM. On the deployed EDS site that block has ALWAYS run by the time
 * this executes, so the `.section-metadata` element is already gone and reading
 * only the DOM table finds nothing (every section looks tab-less → no widget
 * built). So read the dataset FIRST, then fall back to the raw table for any
 * environment/timing where the block hasn't decorated yet (e.g. very early in
 * local dev). Hyphenated dataset keys must be camelCased — `dataset['tab-group']`
 * throws; use `dataset.tabGroup`.
 * @param {Element} section
 */
function readSectionMetadata(section) {
  const config = {};

  // Post-decoration path (deployed EDS, and local once the block has run):
  // metadata lives on the section as data-* attributes.
  const fromDataset = {
    tab: section.dataset.tab,
    'tab-group': section.dataset.tabGroup,
    'tab-intro': section.dataset.tabIntro,
    'tab-style': section.dataset.tabStyle,
  };
  Object.entries(fromDataset).forEach(([key, value]) => {
    if (value !== undefined && value !== '') config[key] = value;
  });

  // Pre-decoration path: read the raw Section Metadata table. Only fills keys
  // the dataset didn't already provide, so the dataset wins when both exist.
  const block = section.querySelector(':scope > .section-metadata, :scope > div > .section-metadata');
  if (block) {
    block.querySelectorAll(':scope > div').forEach((row) => {
      const cells = [...row.children];
      if (cells.length < 2) return;
      const key = cells[0].textContent.trim().toLowerCase();
      const value = cells[1].textContent.trim();
      if (key && config[key] === undefined) config[key] = value;
    });
  }

  return config;
}

/**
 * Build one tabs widget from a run of adjacent sections.
 * @param {object} run { items, labels, intro, style }
 * @param {number} widgetIndex index of this widget on the page (for unique ids)
 */
function buildTabsWidget(run, widgetIndex) {
  const { items: sections, labels, intro } = run;
  if (sections.length < 2) return; // a lone tab section isn't a tabbed widget

  // Anchor the widget where the first element of the run currently sits (the
  // intro heading if present, otherwise the first tab section).
  const anchor = intro || sections[0];
  const wrapper = document.createElement('div');
  // `tab-style` maps to a full-bleed band variant: dark (teal) or light (grey).
  // Absent → the plain in-column widget (no band).
  wrapper.className = 'section-tabs';
  if (run.style === 'dark') wrapper.classList.add('section-tabs-dark');
  else if (run.style === 'light') wrapper.classList.add('section-tabs-light');

  anchor.parentElement.insertBefore(wrapper, anchor);

  // Intro heading section renders above the tablist, inside the same band.
  if (intro) {
    intro.classList.add('section-tabs-intro');
    wrapper.append(intro);
  }

  const tablist = document.createElement('div');
  tablist.className = 'section-tabs-list';
  tablist.setAttribute('role', 'tablist');
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

  // Each accordion inside a panel honours its OWN authored open state (see
  // blocks/accordion) — the source expands specific quarters per tab, so tab
  // switching must NOT reset it. Just show/hide panels.
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
export default function buildSectionTabs(main) {
  if (!main) return;
  const sections = [...main.querySelectorAll(':scope > .section')];
  const runs = [];
  let run = null;

  const isContiguous = (r, section) => r.lastEl === section.previousElementSibling;

  sections.forEach((section) => {
    const meta = readSectionMetadata(section);
    const group = meta['tab-group'] || '';
    const isTab = !!meta.tab;
    const isIntro = meta['tab-intro'] === 'true' || meta['tab-intro'] === 'yes';

    if (isTab || isIntro) {
      // Start a fresh run when the group changes or the section isn't adjacent
      // to the previous run member.
      if (!run || run.group !== group || !isContiguous(run, section)) {
        run = {
          group, items: [], labels: [], intro: null, style: null, lastEl: null,
        };
        runs.push(run);
      }
      if (isIntro) {
        run.intro = section;
      } else {
        run.items.push(section);
        run.labels.push(meta.tab);
      }
      if (meta['tab-style'] === 'dark' || meta['tab-style'] === 'light') {
        run.style = meta['tab-style'];
      }
      run.lastEl = section;
    } else {
      run = null;
    }
  });

  runs.forEach((r, i) => buildTabsWidget(r, i));
}

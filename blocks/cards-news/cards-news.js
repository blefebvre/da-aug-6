/**
 * cards-news — "Recent press releases" list.
 * Authored contract per entry (row): heading + date <p> + tags <p> (comma-joined)
 * + description <p>. No images.
 * Decorates rows into <ul>/<li>, tags each part with a semantic class, and
 * splits the comma-joined tags paragraph into individual chip spans.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((cell) => {
      cell.className = 'cards-news-card-body';

      const title = cell.querySelector('h1, h2, h3, h4, h5, h6');
      if (title) title.classList.add('cards-news-title');

      // Authored paragraph order: date, tags, description(s).
      const [dateEl, tagsEl, ...rest] = [...cell.querySelectorAll(':scope > p')];

      if (dateEl) dateEl.classList.add('cards-news-date');

      if (tagsEl) {
        tagsEl.classList.add('cards-news-tags');
        const tags = tagsEl.textContent.split(',').map((t) => t.trim()).filter(Boolean);
        tagsEl.textContent = '';
        tags.forEach((label) => {
          const chip = document.createElement('span');
          chip.className = 'cards-news-tag';
          chip.textContent = label;
          tagsEl.append(chip);
        });
      }

      rest.forEach((p) => p.classList.add('cards-news-description'));
    });

    ul.append(li);
  });

  block.replaceChildren(ul);
}

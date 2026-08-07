/**
 * cards-event — "Latest results and upcoming events" cards.
 *
 * Two card shapes share one block:
 *  - Standard (investor/report) card: label + title + description + CTA link(s).
 *  - Calendar/event card: a "DD Mon YYYY" date paragraph that is split into a
 *    large day number + month/year badge, followed by label + title.
 *
 * Authored structure (one row = one card, one cell per row):
 *   <div class="cards-event">
 *     <div><div>          <- row / cell
 *       <p>Investors</p>
 *       <h3>…</h3>
 *       <p>description</p>
 *       <p><a>CTA</a></p>
 *     </div></div>
 *     …
 *   </div>
 */

const DATE_RE = /^(\d{1,2})\s+([A-Za-z.]{3,}\s+\d{4})$/;

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    const body = li.firstElementChild;
    if (!body) {
      ul.append(li);
      return;
    }
    body.className = 'cards-event-card-body';

    let actions = null;
    let seenHeading = false;

    [...body.children].forEach((el) => {
      if (/^H[1-6]$/.test(el.tagName)) {
        seenHeading = true;
        return;
      }
      if (el.tagName !== 'P') return;

      const text = el.textContent.trim();
      const dateMatch = text.match(DATE_RE);

      if (dateMatch) {
        // Calendar card — split "22 Sep 2026" into a day/rest badge.
        li.classList.add('cards-event-calendar');
        el.classList.add('cards-event-date');
        el.textContent = '';
        const day = document.createElement('span');
        day.className = 'cards-event-day';
        [day.textContent] = [dateMatch[1]];
        const rest = document.createElement('span');
        rest.className = 'cards-event-date-rest';
        [, , rest.textContent] = dateMatch;
        el.append(day, rest);
      } else if (el.querySelector('a')) {
        // CTA link — collect all links into a single action container.
        const link = el.querySelector('a');
        link.classList.add('cards-event-action-link');
        const href = (link.getAttribute('href') || '').toLowerCase();
        link.classList.add(href.endsWith('.pdf')
          ? 'cards-event-action-download'
          : 'cards-event-action-arrow');
        if (!actions) {
          actions = document.createElement('div');
          actions.className = 'cards-event-actions';
          el.replaceWith(actions);
        } else {
          el.remove();
        }
        actions.append(link);
      } else if (seenHeading) {
        // Text paragraph after the heading → description.
        el.classList.add('cards-event-description');
      } else {
        // Text paragraph before the heading → label / pretitle.
        el.classList.add('cards-event-pretitle');
      }
    });

    if (!li.classList.contains('cards-event-calendar')) {
      li.classList.add('cards-event-standard');
    }

    ul.append(li);
  });

  block.replaceChildren(ul);
}

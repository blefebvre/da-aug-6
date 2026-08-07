function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-stories-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-stories-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });

  // Non-wrapping arrows: disable prev at the first slide, next at the last.
  const prev = block.querySelector('.slide-prev');
  const next = block.querySelector('.slide-next');
  if (prev) prev.disabled = slideIndex <= 0;
  if (next) next.disabled = slideIndex >= slides.length - 1;
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-stories-slide');
  const realSlideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-stories-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-stories-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  // Track the leftmost visible card (multiple cards are visible at once, so
  // scroll position — not per-slide intersection — determines "active").
  const slidesEl = block.querySelector('.carousel-stories-slides');
  const slides = block.querySelectorAll('.carousel-stories-slide');
  let scrollTimer;
  const syncActive = () => {
    const { scrollLeft } = slidesEl;
    let nearest = 0;
    let min = Infinity;
    slides.forEach((slide, idx) => {
      const dist = Math.abs(slide.offsetLeft - scrollLeft);
      if (dist < min) { min = dist; nearest = idx; }
    });
    updateActiveSlide(block, nearest);
  };
  slidesEl.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(syncActive, 100);
  });
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-stories-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-stories-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-stories-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-stories-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-stories-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-stories-slides');
  container.append(slidesWrapper);

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);
    row.remove();
  });

  block.append(container);

  if (!isSingleSlide) {
    // Single control bar below the cards: prev arrow (left), dots (center),
    // next arrow (right) — matches the source layout.
    const controls = document.createElement('div');
    controls.classList.add('carousel-stories-controls');

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'slide-prev';
    prevButton.setAttribute('aria-label', 'Previous Slide');

    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', 'Carousel Slide Controls');
    const slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-stories-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'slide-next';
    nextButton.setAttribute('aria-label', 'Next Slide');

    rows.forEach((row, idx) => {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-stories-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="Show Slide ${idx + 1} of ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    });

    controls.append(prevButton, slideIndicatorsNav, nextButton);
    block.append(controls);

    bindEvents(block);
    // Initialise active state (disables prev at the first slide).
    updateActiveSlide(block, 0);
  }
}

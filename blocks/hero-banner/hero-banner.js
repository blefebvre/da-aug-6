export default function decorate(block) {
  // The first row is the background-image layer. The image may still be a
  // Dynamic Media anchor (`<a href="…scene7…">`) at this point — the DM
  // auto-block converts it to <picture> around now, and ordering isn't
  // guaranteed. So treat the block as having an image if the first row holds a
  // <picture>, an <img>, OR a DM/scene7 anchor; only fall back to `no-image`
  // when the row is genuinely imageless (avoids a stale dark/short hero when the
  // anchor→picture conversion runs after this decorator).
  const firstRow = block.querySelector(':scope > div:first-of-type');
  const hasImage = firstRow && (
    firstRow.querySelector('picture, img')
    || firstRow.querySelector('a[href*="scene7"], a[href*="/is/image/"]')
  );
  if (!hasImage) block.classList.add('no-image');
}

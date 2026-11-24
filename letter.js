// Runs the love letter only while it's on screen. Visitors who ask for reduced
// motion keep the still image and can open the full page instead.
const stage = document.getElementById('stage');

if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    const running = stage.querySelector('iframe');
    if (entry.isIntersecting && !running) {
      const frame = document.createElement('iframe');
      frame.src = 'love-letter/';
      frame.title = 'Love letter, an animated bouquet drawn in text';
      stage.append(frame);
    } else if (!entry.isIntersecting && running) {
      running.remove();
    }
  }, { threshold: 0.01 }).observe(stage);
}

// Dragging is off on touch screens so the page can scroll. A tap opens the full version.
stage.addEventListener('click', () => {
  if (matchMedia('(hover: none)').matches) location.href = 'love-letter/';
});

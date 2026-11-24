const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Local time in Auburn (Central) ----
const SUN = 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19';
const MOON = 'M20 14.500A8.500 8.500 0 019.500 4a8.500 8.500 0 1010.500 10.500z';
function tick() {
  const now = new Date();
  $('#time').textContent = now.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
  $('#time').dateTime = now.toISOString();
  const hour = Number(now.toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }));
  $('#sky').setAttribute('d', hour >= 6 && hour < 18 ? SUN : MOON);
}
tick();
setInterval(tick, 5000);

// ---- Project cards open a sheet; the love letter only runs while its sheet is open ----
$$('.card').forEach((card) => {
  const sheet = document.getElementById(card.getAttribute('aria-controls'));
  const stage = $('.stage', sheet);
  card.addEventListener('click', () => {
    if (document.documentElement.classList.contains('editing')) return;
    sheet.showModal();
    sheet.scrollTop = 0;
    if (stage && !reduced) {
      const frame = document.createElement('iframe');
      frame.src = 'love-letter/';
      frame.title = 'Love letter, an animated bouquet drawn in text';
      stage.append(frame);
    }
  });
  sheet.addEventListener('close', () => { if (stage) $('iframe', stage)?.remove(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
});

// ---- Card movement rests while the cards are off screen ----
if ('IntersectionObserver' in window) {
  const cards = $('.cards');
  new IntersectionObserver(([e]) => cards.classList.toggle('idle', !e.isIntersecting)).observe(cards);
}

// ---- Database: show the table for whoever is logged in ----
$$('input[name="role"]').forEach((input) => input.addEventListener('change', () => {
  $$('.role-view').forEach((v) => { v.hidden = v.dataset.role !== input.value; });
}));
const checked = $('input[name="role"]:checked');
$$('.role-view').forEach((v) => { v.hidden = v.dataset.role !== checked.value; });

// ---- LED: ATmega328P at 16 MHz, r21 fixed at 255; 768 cycles per outer pass plus 6 ----
const slider = $('#r20');
const led = $('#led');
function drawLed() {
  const r20 = Number(slider.value);
  const hz = 16e6 / (2 * (768 * r20 + 6));
  const period = 100 / (hz / 30);
  const soft = period * 0.06;
  $('#r20v').textContent = r20;
  $('#hz').textContent = Math.round(hz).toLocaleString('en-US');
  led.style.backgroundImage = `repeating-linear-gradient(to bottom,
    #0e0a06 0%, #e0ad4f ${soft * 2}%, #e0ad4f ${period / 2 - soft}%, #0e0a06 ${period / 2 + soft}%, #0e0a06 ${period}%)`;
  led.setAttribute('aria-label', `Simulated phone camera frame showing about ${(hz / 30).toFixed(1)} bright stripes`);
}
slider.addEventListener('input', drawLed);
drawLed();

// ---- Dock: mark the section being read ----
const links = $$('.dock a');
const targets = links.map((a) => $(a.getAttribute('href')));
function spy() {
  let current = 0;
  targets.forEach((el, i) => { if (i && el.getBoundingClientRect().top < innerHeight * 0.45) current = i; });
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = links.length - 1;
  links.forEach((a, i) => (i === current ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
}
addEventListener('scroll', spy, { passive: true });
addEventListener('resize', spy);
spy();

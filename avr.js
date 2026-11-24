// Models the delay loop in main.S (ATmega328P at 16 MHz, r21 fixed at 255).
//   each outer pass: ldi 1 + inner loop (255 * 3 - 1) + dec 1 + brne 2 = 768 cycles
//   the last brne falls through (-1); in, ldi, eor, out, ldi add 5; rjmp adds 2
const CLOCK = 16e6;
const FRAME = 1 / 30;
const cyclesPerToggle = (r20) => 768 * r20 - 1 + 5 + 2;

const slider = document.getElementById('r20');
const value = document.getElementById('r20v');
const readout = document.getElementById('readout');
const frame = document.getElementById('frame');

function draw() {
  const r20 = Number(slider.value);
  const cycles = cyclesPerToggle(r20);
  const ms = (cycles / CLOCK) * 1000;
  const hz = CLOCK / (2 * cycles);
  const period = 100 / (hz * FRAME); // one on/off pair, as a share of the frame height

  value.textContent = r20;
  readout.textContent = `${cycles.toLocaleString('en-US')} cycles per toggle, or ${ms.toFixed(2)} ms. Blinks ${Math.round(hz).toLocaleString('en-US')} times a second.`;
  const soft = period * 0.06;
  frame.style.backgroundImage = `repeating-linear-gradient(to bottom,
    #2a1c00 0%, #ffb52e ${soft * 2}%, #ffb52e ${period / 2 - soft}%, #2a1c00 ${period / 2 + soft}%, #2a1c00 ${period}%)`;
  frame.setAttribute('aria-label', `Simulated phone camera frame showing about ${(hz * FRAME).toFixed(1)} bright stripes`);
}

slider.addEventListener('input', draw);
draw();

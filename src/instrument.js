(function () {
  'use strict';

  // Modo de instrumento de toda la web ('guitar' | 'piano') y teclado de piano.
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const BLACK = { 1: true, 3: true, 6: true, 8: true, 10: true };
  const STORAGE_KEY = 'scales-utils.instrument';
  const MODES = [{ value: 'guitar', label: 'Guitarra' }, { value: 'piano', label: 'Piano' }];

  // Rango del teclado: dos octavas y la C final (C3 → C5), en semitonos absolutos.
  const PIANO_LOW = 48;
  const PIANO_HIGH = 72;

  let mode = 'guitar';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'guitar' || saved === 'piano') mode = saved;
  } catch (e) { /* sin almacenamiento: queda guitarra */ }

  function get() { return mode; }

  function set(next) {
    if (next === mode || (next !== 'guitar' && next !== 'piano')) return;
    mode = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignorar */ }
    renderSelector();
    document.dispatchEvent(new CustomEvent('instrumentmodechange', { detail: next }));
  }

  function noteName(pitch) { return NAMES[((pitch % 12) + 12) % 12]; }
  function octaveOf(pitch) { return Math.floor(pitch / 12) - 1; }

  // Dibuja el teclado en `container`. `keyClass(note, pitch)` da clases extra.
  // Cada tecla lleva data-note y data-pitch para los clicks.
  function renderPiano(container, keyClass) {
    container.className = 'piano';
    container.innerHTML = '';
    let whiteIndex = 0;
    for (let pitch = PIANO_LOW; pitch <= PIANO_HIGH; pitch++) {
      const note = noteName(pitch);
      const black = !!BLACK[pitch % 12];
      const extra = keyClass ? keyClass(note, pitch) : '';
      const key = document.createElement('div');
      key.className = 'pkey ' + (black ? 'black' : 'white') + (extra ? ' ' + extra : '');
      key.dataset.note = note;
      key.dataset.pitch = String(pitch);
      key.setAttribute('aria-label', note + octaveOf(pitch));
      if (black) key.style.left = 'calc(var(--pad) + var(--w) * ' + whiteIndex + ' - var(--bw) / 2)';
      else whiteIndex++;
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = note;
      key.appendChild(label);
      if (!black && note === 'C') {
        const oct = document.createElement('span');
        oct.className = 'octave';
        oct.textContent = 'C' + octaveOf(pitch);
        key.appendChild(oct);
      }
      container.appendChild(key);
    }
  }

  // Selector Guitarra / Piano de la cabecera.
  function renderSelector() {
    const seg = document.getElementById('mode-seg');
    if (!seg) return;
    seg.innerHTML = '';
    MODES.forEach(function (m) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = m.label;
      b.setAttribute('aria-pressed', String(m.value === mode));
      b.addEventListener('click', function () { set(m.value); });
      seg.appendChild(b);
    });
    document.documentElement.dataset.instrument = mode;
  }

  renderSelector();

  window.InstrumentMode = {
    get: get, set: set, renderPiano: renderPiano,
    PIANO_LOW: PIANO_LOW, PIANO_HIGH: PIANO_HIGH,
  };
})();

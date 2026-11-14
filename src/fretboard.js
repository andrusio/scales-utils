(function () {
  'use strict';

  const Core = window.ScalesCore;

  // Cantidad de puntos de marca por traste (12 y sus octavas llevan doble punto).
  const FRET_DOTS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2 };

  // Dibuja un mástil en `container`: una fila por cuerda (aguda arriba) y una
  // columna por traste (0 = al aire), más la fila de números y marcas.
  // `cellClass(stringIndex, fret, note)` devuelve clases extra para cada casilla.
  function render(container, config, cellClass) {
    container.className = 'fretboard';
    container.innerHTML = '';
    const rows = Core.renderOrder(config.tuning);
    for (const row of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'string-row';
      for (let fret = 0; fret <= config.frets; fret++) {
        const note = Core.noteAtPosition(config.tuning, row.tuningIndex, fret);
        const extra = cellClass ? cellClass(row.tuningIndex, fret, note) : '';
        const cell = document.createElement('div');
        cell.className = 'note' + (extra ? ' ' + extra : '');
        cell.dataset.note = note;
        cell.dataset.string = String(row.tuningIndex);
        cell.dataset.fret = String(fret);
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = note;
        cell.appendChild(label);
        rowEl.appendChild(cell);
      }
      container.appendChild(rowEl);
    }

    const markers = document.createElement('div');
    markers.className = 'fret-markers';
    for (let fret = 0; fret <= config.frets; fret++) {
      const m = document.createElement('div');
      const dots = FRET_DOTS[fret % 12 === 0 && fret > 0 ? 12 : fret] || 0;
      m.className = 'fret-marker' + (dots ? ' has-dot' : '');
      m.dataset.fret = String(fret);
      const dotsEl = document.createElement('div');
      dotsEl.className = 'dots';
      for (let i = 0; i < dots; i++) {
        const d = document.createElement('span');
        d.className = 'dot';
        dotsEl.appendChild(d);
      }
      m.appendChild(dotsEl);
      m.appendChild(document.createTextNode(String(fret)));
      markers.appendChild(m);
    }
    container.appendChild(markers);
  }

  window.Fretboard = { render: render };
})();

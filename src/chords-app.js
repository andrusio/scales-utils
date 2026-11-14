(function () {
  'use strict';

  const K = window.ChordsCore;
  const ALIAS = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };

  const state = {
    positions: new Map(), // "cuerda:traste" (guitarra) o "p<altura>" (piano) -> {pitch}
    reading: 0,           // lectura elegida entre las exactas
    saved: [],            // acordes guardados: {label, root, triad, baseLabel}
  };

  const el = {
    board: document.getElementById('chord-fretboard'),
    instrument: document.getElementById('chord-instrument'),
    editInstrument: document.getElementById('chord-edit-instrument'),
    clearBoard: document.getElementById('chord-clear-board'),
    result: document.getElementById('chord-result'),
    saved: document.getElementById('saved-chords'),
    toCircle: document.getElementById('to-circle'),
    savedClear: document.getElementById('saved-clear'),
    savedNote: document.getElementById('saved-note'),
  };

  function config() { return window.scalesApp.state.config; }

  function noteHtml(pc) {
    return K.NAMES[pc] + (ALIAS[pc] ? '<span class="alias">/' + ALIAS[pc] + '</span>' : '');
  }

  function isPiano() { return window.InstrumentMode.get() === 'piano'; }

  // Notas marcadas (clases de altura) y la más grave.
  function analyze() {
    let bassPitch = Infinity;
    let bassPc = null;
    const pcs = [];
    state.positions.forEach(function (p) {
      const pitch = p.pitch;
      const pc = ((pitch % 12) + 12) % 12;
      pcs.push(pc);
      if (pitch < bassPitch) { bassPitch = pitch; bassPc = pc; }
    });
    return K.identify(pcs, bassPc === null ? 0 : bassPc);
  }

  function currentReading(r) {
    if (!r || !r.exact.length) return null;
    return r.exact[Math.min(state.reading, r.exact.length - 1)];
  }

  // ---- Mástil ----
  function renderBoard(reading) {
    const mark = function (key, note) {
      if (!state.positions.has(key)) return '';
      const isRoot = reading && K.NAMES[reading.root] === note;
      return 'selected' + (isRoot ? ' chord-root' : '');
    };
    el.board.setAttribute('aria-label', isPiano() ? 'Teclado para armar acordes' : 'Mástil para armar acordes');
    if (isPiano()) {
      window.InstrumentMode.renderPiano(el.board, function (note, pitch) { return mark('p' + pitch, note); });
    } else {
      window.Fretboard.render(el.board, config(), function (s, f, note) { return mark(s + ':' + f, note); });
    }
  }

  el.board.addEventListener('click', function (e) {
    const cell = e.target.closest('[data-note]');
    if (!cell) return;
    let key;
    let pitch;
    if (cell.dataset.pitch !== undefined) {
      pitch = Number(cell.dataset.pitch);
      key = 'p' + pitch;
    } else {
      const s = Number(cell.dataset.string);
      const f = Number(cell.dataset.fret);
      key = s + ':' + f;
      pitch = K.openPitches(config().tuning)[s] + f;
    }
    if (state.positions.has(key)) state.positions.delete(key);
    else state.positions.set(key, { pitch: pitch });
    state.reading = 0;
    render();
  });

  // ---- Resultado ----
  function tonesTable(reading) {
    let html = '<div class="tone-table">';
    reading.tones.forEach(function (t) {
      const cls = 'tone-row' + (t.degree === '1' ? ' is-root' : '') + (t.present ? '' : ' absent');
      const tag = t.omitted ? ' <span class="tone-tag">omitida</span>' : t.missing ? ' <span class="tone-tag">falta</span>' : '';
      html += '<div class="' + cls + '"><span class="tone-note">' + noteHtml(t.pc) + '</span>' +
        '<span class="tone-int">' + t.interval + tag + '</span></div>';
    });
    return html + '</div>';
  }

  function renderResult(r) {
    const reading = currentReading(r);
    if (!r) {
      el.result.innerHTML = '<p class="empty">Tocá notas en el instrumento para formar un acorde. Volvé a tocar una nota para quitarla.</p>';
      return;
    }

    let html = '<p class="chord-notes">Notas: ' + r.notes.map(noteHtml).join(' ') +
      ' <span class="alias">· bajo: ' + K.NAMES[r.bass] + '</span></p>';

    if (reading) {
      const extra = [reading.typeName];
      if (reading.noFifth) extra.push('sin quinta');
      if (reading.inversion) extra.push(reading.inversion);
      html += '<div class="chord-name">' + reading.label + '</div>' +
        '<div class="chord-type">' + extra.join(' · ') + '</div>' +
        tonesTable(reading);

      if (r.exact.length > 1) {
        html += '<p class="chord-alt-head">También se puede leer como:</p><div class="chips chord-alts">';
        r.exact.forEach(function (alt, i) {
          html += '<button type="button" class="key-btn' + (alt === reading ? ' active' : '') + '" data-reading="' + i + '">' + alt.label + '</button>';
        });
        html += '</div>';
      }
      html += '<div class="chord-actions"><button type="button" class="primary" id="save-chord">Guardar acorde</button></div>';
    } else {
      if (r.interval) html += '<div class="chord-type">Intervalo: <strong>' + r.interval + '</strong> (' + K.NAMES[r.notes[0]] + ' → ' + K.NAMES[r.notes[1]] + ')</div>';
      if (r.notes.length === 1) {
        html += '<p class="empty">Una sola nota. Agregá al menos otra para formar un acorde.</p>';
      } else if (r.partial.length) {
        html += '<p class="chord-alt-head">No es un acorde completo. Con una nota más podría ser:</p><ul class="partial-list">';
        r.partial.forEach(function (p) {
          html += '<li><strong>' + p.label + '</strong> <span class="alias">(' + p.typeName.toLowerCase() +
            ', falta ' + p.missing.map(function (m) { return K.NAMES[m]; }).join(', ') + ')</span></li>';
        });
        html += '</ul>';
      } else {
        html += '<p class="empty">No reconozco este acorde.</p>';
      }
    }
    el.result.innerHTML = html;

    el.result.querySelectorAll('[data-reading]').forEach(function (b) {
      b.addEventListener('click', function () { state.reading = Number(b.dataset.reading); render(); });
    });
    const saveBtn = document.getElementById('save-chord');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveChord(reading); });
  }

  // ---- Lista de acordes guardados ----
  function saveChord(reading) {
    state.saved.push({ label: reading.label, baseLabel: reading.baseLabel, root: reading.root, triad: reading.triad });
    el.savedNote.textContent = '';
    renderSaved();
  }

  function renderSaved() {
    el.saved.innerHTML = '';
    if (!state.saved.length) {
      el.saved.innerHTML = '<p class="empty">Todavía no guardaste acordes. Armá uno en el instrumento y tocá “Guardar acorde”.</p>';
    }
    state.saved.forEach(function (c, i) {
      const chip = document.createElement('span');
      chip.className = 'chip' + (c.triad ? '' : ' out');
      chip.innerHTML = '<span class="chip-idx">' + (i + 1) + '</span><strong>' + c.label + '</strong>';
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'chip-x';
      x.setAttribute('aria-label', 'Quitar ' + c.label);
      x.textContent = '×';
      x.addEventListener('click', function () { state.saved.splice(i, 1); renderSaved(); });
      chip.appendChild(x);
      el.saved.appendChild(chip);
    });
    el.toCircle.disabled = state.saved.length === 0;
    el.savedClear.disabled = state.saved.length === 0;
  }

  function triadLabel(c) {
    return K.NAMES[c.root] + (c.triad === 'minor' ? 'm' : c.triad === 'dim' ? '°' : '');
  }

  // Manda la lista al círculo: cada acorde se ubica por su tríada (G7 → G, Bm7b5 → B°).
  el.toCircle.addEventListener('click', function () {
    const chords = [];
    const reduced = [];
    const skipped = [];
    state.saved.forEach(function (c) {
      if (!c.triad) { skipped.push(c.label); return; }
      const t = triadLabel(c);
      if (t !== c.label) reduced.push(c.label + ' → ' + t);
      chords.push({ root: c.root, quality: c.triad });
    });
    const notes = [];
    if (reduced.length) notes.push('En el círculo se ubican por su tríada: ' + reduced.join(', ') + '.');
    if (skipped.length) notes.push('No tienen lugar en el círculo: ' + skipped.join(', ') + '.');
    if (!chords.length) {
      el.savedNote.textContent = notes.join(' ');
      return;
    }
    window.circleApp.setChords(chords, notes.join(' '));
    window.tabsApp.show('circle');
    window.scrollTo(0, 0);
  });

  el.savedClear.addEventListener('click', function () {
    state.saved = [];
    el.savedNote.textContent = '';
    renderSaved();
  });

  el.clearBoard.addEventListener('click', function () {
    state.positions.clear();
    state.reading = 0;
    render();
  });

  el.editInstrument.addEventListener('click', function () { window.tabsApp.show('scales'); });

  // Si cambia el instrumento (o su afinación), las posiciones marcadas dejan de tener sentido.
  function resetBoard() {
    state.positions.clear();
    state.reading = 0;
    render();
  }
  document.addEventListener('instrumentchange', function () { if (!isPiano()) resetBoard(); });
  document.addEventListener('instrumentmodechange', resetBoard);

  function render() {
    const cfg = config();
    el.editInstrument.hidden = isPiano();
    el.instrument.textContent = isPiano() ? '' : 'Afinación: ' + cfg.tuning.join(' ') + ' · ' + cfg.frets + ' trastes';
    const r = analyze();
    renderBoard(currentReading(r));
    renderResult(r);
  }

  render();
  renderSaved();

  window.chordsApp = { state: state, render: render };
})();

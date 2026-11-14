(function () {
  'use strict';

  const K = window.ChordsCore;
  const C = window.CircleCore;
  const S = window.Spelling;
  const Core = window.ScalesCore;

  const state = {
    positions: new Map(), // "cuerda:traste" (guitarra) o "p<altura>" (piano) -> {pitch (MIDI)}
    reading: 0,           // lectura elegida entre las exactas
    saved: [],            // acordes guardados: {root, typeId, bass}
    capo: 0,
  };

  const el = {
    board: document.getElementById('chord-fretboard'),
    instrument: document.getElementById('chord-instrument'),
    editInstrument: document.getElementById('chord-edit-instrument'),
    clearBoard: document.getElementById('chord-clear-board'),
    result: document.getElementById('chord-result'),
    saved: document.getElementById('saved-chords'),
    savedTools: document.getElementById('saved-tools'),
    toCircle: document.getElementById('to-circle'),
    savedClear: document.getElementById('saved-clear'),
    savedNote: document.getElementById('saved-note'),
    play: document.getElementById('saved-play'),
    down: document.getElementById('transpose-down'),
    up: document.getElementById('transpose-up'),
    share: document.getElementById('saved-share'),
    capoRow: document.getElementById('capo-row'),
    capo: document.getElementById('capo'),
    capoShapes: document.getElementById('capo-shapes'),
    scales: document.getElementById('chord-scales'),
  };

  function config() { return window.scalesApp.state.config; }
  function isPiano() { return window.InstrumentMode.get() === 'piano'; }
  function mod(n) { return ((n % 12) + 12) % 12; }

  function nameHtml(name) {
    const alt = S.enharmonic(name);
    return name + (alt ? '<span class="alias">/' + alt + '</span>' : '');
  }

  // Notas marcadas (clases de altura) y la más grave.
  function analyze() {
    let bassPitch = Infinity;
    let bassPc = null;
    const pcs = [];
    state.positions.forEach(function (p) {
      const pc = mod(p.pitch);
      pcs.push(pc);
      if (p.pitch < bassPitch) { bassPitch = p.pitch; bassPc = pc; }
    });
    return K.identify(pcs, bassPc === null ? 0 : bassPc);
  }

  function currentReading(r) {
    if (!r || !r.exact.length) return null;
    return r.exact[Math.min(state.reading, r.exact.length - 1)];
  }

  function markedMidis() {
    const out = [];
    state.positions.forEach(function (p) { out.push(p.pitch); });
    return out;
  }

  // ---- Instrumento ----
  function renderBoard(reading) {
    el.board.setAttribute('aria-label', isPiano() ? 'Teclado para armar acordes' : 'Mástil para armar acordes');
    const names = {};
    if (reading) reading.tones.forEach(function (t) { names[t.pc] = t.name; });
    window.InstrumentMode.renderBoard(el.board, {
      config: config(),
      cls: function (i) {
        const key = i.string !== undefined ? i.string + ':' + i.fret : 'p' + i.pitch;
        if (!state.positions.has(key)) return '';
        const isRoot = reading && reading.root === mod(i.pitch);
        return 'selected' + (isRoot ? ' chord-root' : '');
      },
      label: function (i) { return names[mod(i.pitch)] || null; },
    });
  }

  el.board.addEventListener('click', function (e) {
    const cell = e.target.closest('[data-note]');
    if (!cell) return;
    const info = window.InstrumentMode.cellInfo(cell, config());
    if (state.positions.has(info.key)) {
      state.positions.delete(info.key);
    } else {
      state.positions.set(info.key, { pitch: info.pitch });
      window.Sound.tap(info.pitch);
    }
    state.reading = 0;
    render();
  });

  // ---- Resultado ----
  function tonesTable(reading) {
    let html = '<div class="tone-table">';
    reading.tones.forEach(function (t) {
      const cls = 'tone-row' + (t.degree === '1' ? ' is-root' : '') + (t.present ? '' : ' absent');
      const tag = t.omitted ? ' <span class="tone-tag">omitida</span>' : t.missing ? ' <span class="tone-tag">falta</span>' : '';
      html += '<div class="' + cls + '"><span class="tone-note">' + nameHtml(t.name) + '</span>' +
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

    const names = {};
    if (reading) reading.tones.forEach(function (t) { names[t.pc] = t.name; });
    const nm = function (pc) { return names[pc] || K.NAMES[pc]; };
    let html = '<p class="chord-notes">Notas: ' + r.notes.map(nm).join(' ') +
      ' <span class="alias">· bajo: ' + nm(r.bass) + '</span></p>';

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
      html += '<div class="chord-actions">' +
        '<button type="button" class="primary" id="save-chord">Guardar acorde</button>' +
        '<button type="button" id="play-chord">▶ Junto</button>' +
        '<button type="button" id="play-arp">▶ Arpegio</button></div>';
    } else {
      if (r.interval) html += '<div class="chord-type">Intervalo: <strong>' + r.interval + '</strong> (' + K.NAMES[r.notes[0]] + ' → ' + K.NAMES[r.notes[1]] + ')</div>';
      if (r.notes.length === 1) {
        html += '<p class="empty">Una sola nota. Agregá al menos otra para formar un acorde.</p>';
      } else if (r.partial.length) {
        html += '<p class="chord-alt-head">No es un acorde completo. Con una nota más podría ser:</p><ul class="partial-list">';
        r.partial.forEach(function (p) {
          html += '<li><strong>' + p.label + '</strong> <span class="alias">(' + p.typeName.toLowerCase() +
            ', falta ' + p.missingNames.join(', ') + ')</span></li>';
        });
        html += '</ul>';
      } else {
        html += '<p class="empty">No reconozco este acorde.</p>';
      }
      if (r.notes.length > 1) {
        html += '<div class="chord-actions"><button type="button" id="play-chord">▶ Junto</button><button type="button" id="play-arp">▶ Arpegio</button></div>';
      }
    }
    el.result.innerHTML = html;

    el.result.querySelectorAll('[data-reading]').forEach(function (b) {
      b.addEventListener('click', function () { state.reading = Number(b.dataset.reading); render(); });
    });
    const saveBtn = document.getElementById('save-chord');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveChord(reading); });
    const playBtn = document.getElementById('play-chord');
    if (playBtn) playBtn.addEventListener('click', function () { window.Sound.chord(markedMidis(), false); });
    const arpBtn = document.getElementById('play-arp');
    if (arpBtn) arpBtn.addEventListener('click', function () { window.Sound.chord(markedMidis(), true); });
  }

  // ---- Lista de acordes guardados ----
  function info(c) { return K.chordInfo(c.root, c.typeId, c.bass); }

  function saveChord(reading) {
    state.saved.push({ root: reading.root, typeId: reading.typeId, bass: reading.bass });
    el.savedNote.textContent = '';
    renderSaved();
  }

  function transpose(n) {
    state.saved = state.saved.map(function (c) {
      return { root: mod(c.root + n), typeId: c.typeId, bass: mod(c.bass + n) };
    });
    renderSaved();
  }

  // Tonalidad estimada a partir de las tríadas de la lista (como el círculo).
  function estimatedKey() {
    const triads = state.saved
      .map(function (c) { return { root: c.root, quality: K.typeById(c.typeId).triad }; })
      .filter(function (c) { return c.quality; });
    return C.suggestFromChords(triads);
  }

  function renderScales() {
    el.scales.innerHTML = '';
    if (!state.saved.length) return;
    const s = estimatedKey();
    const key = s ? s.center : null;
    let html = '<h3 class="sub-head">Qué escala tocar encima</h3>';
    if (s) {
      html += '<p class="keys-head">Tonalidad estimada: <strong>' + C.keyName(key, 'major') + ' mayor</strong> (o ' +
        C.keyName(C.relativeMinor(key), 'minor') + ' menor)' + (s.complete ? '' : ', con acordes de afuera') + '.</p>';
    }
    html += '<div class="scale-sugs">';
    const seen = {};
    state.saved.forEach(function (c) {
      const label = info(c).label;
      if (seen[label]) return;
      seen[label] = true;
      const sug = K.chordScale(c.root, c.typeId, key);
      const vs = Core.viewScale(sug.scale);
      const rootName = S.spell(c.root, vs.degrees).root;
      const why = sug.diatonic ? sug.numeral + ' de ' + C.keyName(key, 'major') + ' mayor' : 'fuera de la tonalidad: según el tipo de acorde';
      html += '<div class="sug-row"><span class="sug-chord">' + label + '</span><span class="sug-arrow">→</span>' +
        '<span class="sug-scale"><strong>' + rootName + ' ' + vs.name + '</strong><small>' + why + '</small></span>' +
        '<span class="sug-actions"><button type="button" class="mini-btn" data-play="' + c.root + '|' + vs.name + '" title="Escuchar la escala">▶</button>' +
        '<button type="button" class="mini-btn" data-view="' + c.root + '|' + vs.name + '" title="Ver la escala en el instrumento">Ver</button></span></div>';
    });
    html += '</div>';
    el.scales.innerHTML = html;
    el.scales.querySelectorAll('[data-play]').forEach(function (b) {
      const parts = b.dataset.play.split('|');
      b.addEventListener('click', function () { window.scalesApp.playScale(Number(parts[0]), parts[1]); });
    });
    el.scales.querySelectorAll('[data-view]').forEach(function (b) {
      const parts = b.dataset.view.split('|');
      b.addEventListener('click', function () {
        window.scalesApp.showScale(Number(parts[0]), parts[1]);
        window.tabsApp.show('scales');
        window.scrollTo(0, 0);
      });
    });
  }

  function renderCapo() {
    el.capoRow.hidden = isPiano() || !state.saved.length;
    if (el.capoRow.hidden) return;
    el.capo.value = String(state.capo);
    if (state.capo === 0) {
      el.capoShapes.textContent = 'Elegí un traste para ver qué formas tocar con capo y que suene igual.';
      return;
    }
    const shapes = state.saved.map(function (c) { return K.chordInfo(mod(c.root - state.capo), c.typeId, mod(c.bass - state.capo)).label; });
    el.capoShapes.innerHTML = 'Con capo en el traste ' + state.capo + ' tocá: <strong>' + shapes.join(' · ') + '</strong>';
  }

  function renderSaved() {
    el.saved.innerHTML = '';
    if (!state.saved.length) {
      el.saved.innerHTML = '<p class="empty">Todavía no guardaste acordes. Armá uno en el instrumento y tocá “Guardar acorde”.</p>';
    }
    state.saved.forEach(function (c, i) {
      const chip = document.createElement('span');
      chip.className = 'chip' + (K.typeById(c.typeId).triad ? '' : ' out');
      chip.innerHTML = '<span class="chip-idx">' + (i + 1) + '</span><strong>' + info(c).label + '</strong>';
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'chip-x';
      x.setAttribute('aria-label', 'Quitar ' + info(c).label);
      x.textContent = '×';
      x.addEventListener('click', function () { state.saved.splice(i, 1); renderSaved(); });
      chip.appendChild(x);
      el.saved.appendChild(chip);
    });
    const empty = state.saved.length === 0;
    el.toCircle.disabled = empty;
    el.savedClear.disabled = empty;
    el.savedTools.hidden = empty;
    renderCapo();
    renderScales();
  }

  // Manda la lista al círculo: cada acorde se ubica por su tríada (G7 → G, Bm7b5 → B°).
  el.toCircle.addEventListener('click', function () {
    const chords = [];
    const reduced = [];
    const skipped = [];
    state.saved.forEach(function (c) {
      const label = info(c).label;
      const triad = K.typeById(c.typeId).triad;
      if (!triad) { skipped.push(label); return; }
      const t = C.chordLabel({ root: c.root, quality: triad });
      if (t !== label) reduced.push(label + ' → ' + t);
      chords.push({ root: c.root, quality: triad });
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
  el.play.addEventListener('click', function () {
    window.Sound.progression(state.saved.map(function (c) { return K.chordPitches(c.root, c.typeId, c.bass, 48); }), 1.1);
  });
  el.down.addEventListener('click', function () { transpose(-1); });
  el.up.addEventListener('click', function () { transpose(1); });
  el.share.addEventListener('click', function () {
    const list = state.saved.map(function (c) { return c.root + '.' + c.typeId + '.' + c.bass; }).join(',');
    window.tabsApp.share('#acordes?lista=' + encodeURIComponent(list), el.share);
  });
  for (let i = 0; i <= 9; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = i === 0 ? 'Sin capo' : 'Traste ' + i;
    el.capo.appendChild(o);
  }
  el.capo.addEventListener('change', function () { state.capo = Number(el.capo.value); renderCapo(); });

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
    renderCapo();
  }
  document.addEventListener('instrumentchange', function () { if (!isPiano()) resetBoard(); });
  document.addEventListener('instrumentmodechange', resetBoard);

  // Link compartido: #acordes?lista=<raíz>.<tipo>.<bajo>,...
  function applyParams(params) {
    const list = params.get('lista');
    if (!list) return;
    const out = [];
    decodeURIComponent(list).split(',').forEach(function (item) {
      const p = item.split('.');
      const root = Number(p[0]);
      const bass = Number(p[2]);
      if (root >= 0 && root < 12 && bass >= 0 && bass < 12 && K.typeById(p[1])) {
        out.push({ root: root, typeId: p[1], bass: bass });
      }
    });
    if (out.length) { state.saved = out; renderSaved(); }
  }

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

  window.chordsApp = { state: state, render: render, applyParams: applyParams };
})();
